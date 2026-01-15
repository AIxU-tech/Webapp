"""
University Request Model

Represents a pending request to add a new university to the AIxU platform.
These requests are submitted by verified .edu email users whose university
is not yet in the system.

Request Lifecycle:
1. PENDING - Initial state, awaiting admin review
2. APPROVED - Admin approved, university created, account creation token generated
3. REJECTED - Admin rejected the request

Account Creation Flow:
When a request is approved, a secure token is generated and sent via email.
The requester uses this token to complete their account setup (just password,
no email verification needed since their email was already verified).

The requester's email is verified before submission, proving they are
actually a student at the claimed university.
"""

from datetime import datetime, timedelta
from backend.extensions import db


class RequestStatus:
    """
    Status constants for university requests.

    PENDING: Request awaiting admin review
    APPROVED: Request approved and university created
    REJECTED: Request rejected by admin
    """
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    VALID_STATUSES = [PENDING, APPROVED, REJECTED]

    @classmethod
    def is_valid(cls, status: str) -> bool:
        """Check if a status value is valid."""
        return status in cls.VALID_STATUSES


class UniversityRequest(db.Model):
    """
    Model for storing pending university addition requests.

    When a user tries to register with a .edu email that doesn't match
    any existing university, they can submit a request to add their
    university. This request includes:

    1. Verified requester information (email verified via 6-digit code)
    2. University details (name, location, email domain)
    3. Club details (club name, description, tags)

    Admins can then review and approve/reject these requests.

    Attributes:
        id: Primary key
        status: Request status (pending/approved/rejected)

        # Requester Info (verified via email)
        requester_email: The .edu email that was verified
        requester_first_name: Requester's first name
        requester_last_name: Requester's last name

        # University Details
        university_name: Full name of the university
        university_location: Geographic location
        email_domain: The .edu email domain (e.g., "uoregon" for @uoregon.edu)

        # Club Details
        club_name: Name of the AI club
        club_description: Description of the club
        club_tags: JSON array of topic tags

        # Timestamps
        created_at: When the request was submitted
        updated_at: When the request was last modified
        reviewed_at: When an admin reviewed the request
        reviewed_by_id: Admin who reviewed the request

        # Admin Notes
        admin_notes: Notes from admin about approval/rejection
    """
    __tablename__ = 'university_requests'

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default=RequestStatus.PENDING, nullable=False)

    # Requester Information (verified via email code)
    requester_email = db.Column(db.String(255), nullable=False)
    requester_first_name = db.Column(db.String(50), nullable=False)
    requester_last_name = db.Column(db.String(50), nullable=False)

    # University Details
    university_name = db.Column(db.String(200), nullable=False)
    university_location = db.Column(db.String(200), nullable=False)
    email_domain = db.Column(db.String(100), nullable=False)

    # Club Details
    club_name = db.Column(db.String(200), nullable=False)
    club_description = db.Column(db.Text, nullable=False)
    club_tags = db.Column(db.Text, nullable=True)  # JSON array
    social_links = db.Column(db.Text, nullable=True)  # JSON array of {type, url}

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Admin Notes
    admin_notes = db.Column(db.Text, nullable=True)

    # Account Creation Token (for secure account creation link after approval)
    # Generated when request is approved, expires after 7 days
    account_creation_token = db.Column(db.String(64), nullable=True, unique=True, index=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)

    # Tracks if the requester has completed account creation
    # References the User created from this request
    account_created_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Relationship to admin who reviewed
    reviewed_by = db.relationship('User', backref='reviewed_university_requests', foreign_keys=[reviewed_by_id])

    # Relationship to user created from this request
    created_user = db.relationship('User', backref='university_request_origin', foreign_keys=[account_created_user_id])

    def __repr__(self):
        return f'<UniversityRequest {self.id}: {self.university_name} ({self.status})>'

    def to_dict(self) -> dict:
        """Serialize request to dictionary for API responses."""
        import json

        return {
            'id': self.id,
            'status': self.status,
            'requesterEmail': self.requester_email,
            'requesterFirstName': self.requester_first_name,
            'requesterLastName': self.requester_last_name,
            'requesterFullName': f"{self.requester_first_name} {self.requester_last_name}",
            'universityName': self.university_name,
            'universityLocation': self.university_location,
            'emailDomain': self.email_domain,
            'clubName': self.club_name,
            'clubDescription': self.club_description,
            'clubTags': json.loads(self.club_tags) if self.club_tags else [],
            'socialLinks': json.loads(self.social_links) if self.social_links else [],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewedById': self.reviewed_by_id,
            'adminNotes': self.admin_notes,
            # Token expiry info (token itself is not exposed for security)
            'tokenExpiresAt': self.token_expires_at.isoformat() if self.token_expires_at else None,
            'accountCreated': self.account_created_user_id is not None,
        }

    @classmethod
    def get_pending_requests(cls) -> list:
        """Get all pending requests, ordered by creation date."""
        return cls.query.filter_by(status=RequestStatus.PENDING) \
            .order_by(cls.created_at.asc()).all()

    @classmethod
    def get_by_email(cls, email: str):
        """
        Get the most recent request for an email.

        Useful for checking if user already has a pending request.
        """
        return cls.query.filter_by(requester_email=email) \
            .order_by(cls.created_at.desc()).first()

    @classmethod
    def has_pending_request(cls, email: str) -> bool:
        """Check if an email already has a pending request."""
        return cls.query.filter_by(
            requester_email=email,
            status=RequestStatus.PENDING
        ).first() is not None

    def approve(self, admin_id: int, notes: str = None, commit: bool = False):
        """
        Approve this request.

        Note: This only updates the request status.
        The caller is responsible for creating the actual University
        and User records, and for committing the transaction.

        Args:
            admin_id: ID of the admin approving the request
            notes: Optional notes about the approval
            commit: Whether to commit the transaction (default False)
        """
        self.status = RequestStatus.APPROVED
        self.reviewed_at = datetime.utcnow()
        self.reviewed_by_id = admin_id
        if notes:
            self.admin_notes = notes
        if commit:
            db.session.commit()

    def reject(self, admin_id: int, notes: str = None, commit: bool = False):
        """
        Reject this request.

        Args:
            admin_id: ID of the admin rejecting the request
            notes: Reason for rejection (recommended)
            commit: Whether to commit the transaction (default False)
        """
        self.status = RequestStatus.REJECTED
        self.reviewed_at = datetime.utcnow()
        self.reviewed_by_id = admin_id
        if notes:
            self.admin_notes = notes
        if commit:
            db.session.commit()

    def generate_account_creation_token(self, expiry_days: int = 7) -> str:
        """
        Generate a secure token for account creation and set expiry.

        This token is sent in the approval email and allows the requester
        to complete their account setup without email verification (since
        their email was already verified during the request process).

        Args:
            expiry_days: Number of days until token expires (default 7)

        Returns:
            The generated token string
        """
        from backend.utils.email import generate_secure_token

        # Generate a cryptographically secure token
        self.account_creation_token = generate_secure_token(32)
        self.token_expires_at = datetime.utcnow() + timedelta(days=expiry_days)

        return self.account_creation_token

    @classmethod
    def find_by_token(cls, token: str):
        """
        Find a valid, unexpired request by its account creation token.

        A token is valid if:
        1. It matches a request with APPROVED status
        2. The token hasn't expired
        3. An account hasn't already been created for this request

        Args:
            token: The account creation token to look up

        Returns:
            UniversityRequest instance if found and valid, None otherwise
        """
        if not token:
            return None

        now = datetime.utcnow()
        return cls.query.filter_by(
            account_creation_token=token,
            status=RequestStatus.APPROVED
        ).filter(
            cls.token_expires_at > now,
            cls.account_created_user_id.is_(None)
        ).first()

    def is_token_valid(self) -> bool:
        """
        Check if this request's account creation token is still valid.

        Returns:
            True if token exists, hasn't expired, and account not created
        """
        if not self.account_creation_token or not self.token_expires_at:
            return False

        if self.account_created_user_id is not None:
            return False

        return datetime.utcnow() < self.token_expires_at

    def mark_account_created(self, user_id: int):
        """
        Mark that an account was created from this request.

        This invalidates the token (one-time use) and links
        the created user to this request.

        Args:
            user_id: ID of the user account that was created
        """
        self.account_created_user_id = user_id
        # Clear the token for security (one-time use)
        self.account_creation_token = None
        self.token_expires_at = None
