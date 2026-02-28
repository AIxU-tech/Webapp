"""
Seed Data Script for AIxU Development Environment

Run this script to populate your local database with fake data:
    python -m backend.seed_data

Or from the project root:
    python backend/seed_data.py
"""

import random
from datetime import datetime, timedelta

# Setup Flask app context
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# SAFETY: Only use DEV database URLs to prevent accidental production data loss
# Try DEV_DATABASE_URL_LOCAL first (for running from host machine),
# then fall back to DEV_DATABASE_URL (for running inside Docker)
DEV_DB_URL = os.environ.get('DEV_DATABASE_URL_LOCAL') or os.environ.get('DEV_DATABASE_URL')
if not DEV_DB_URL:
    print("ERROR: No dev database URL set in environment.")
    print("This script only runs against the development database for safety.")
    print("Set DEV_DATABASE_URL_LOCAL or DEV_DATABASE_URL in your .env file.")
    sys.exit(1)

print(f"Using database: {DEV_DB_URL.split('@')[1] if '@' in DEV_DB_URL else DEV_DB_URL}")

# Override DATABASE_URL with dev URL before importing app
os.environ['DATABASE_URL'] = DEV_DB_URL

from backend import create_app
from backend.extensions import db
from backend.models.user import User
from backend.models.university import University
from backend.models.note import Note
from backend.models.message import Message
from backend.models.relationships import UserFollows
from backend.models.university_role import UniversityRole
from backend.models.ai_news import AINewsStory, AINewsSource, AIResearchPaper, AINewsChatMessage
from backend.models.opportunity import Opportunity
from backend.models.event import Event, EventAttendee
from backend.models.speaker import Speaker
from backend.constants import UniversityRoles, ADMIN
from backend.utils.profile import create_initial_education


# =============================================================================
# Development Constants
# =============================================================================
# Dev user for auto-login (created on startup when DEV_MODE=true)
DEV_USER_EMAIL = 'dev@test.edu'
DEV_USER_PASSWORD = 'dev'
DEV_UNIVERSITY_DOMAIN = 'test'

# Shared password for all seeded test users (used by seed_all)
SEED_USER_PASSWORD = 'password123'


def ensure_dev_user():
    """
    Ensure the dev user exists for auto-login in development.

    Creates a simple test user (dev@test.edu / dev) with admin privileges
    if not already present. Also creates a Test University if needed.

    This function is idempotent - safe to call on every app startup.
    It only creates records if they don't already exist.

    Returns:
        User: The dev user object, or None if creation failed
    """
    # Check if dev user already exists
    existing_user = User.query.filter_by(email=DEV_USER_EMAIL).first()
    if existing_user:
        print(f"Dev user already exists: {DEV_USER_EMAIL}")
        return existing_user

    # Ensure Test University exists for the dev user
    test_university = University.query.filter_by(email_domain=DEV_UNIVERSITY_DOMAIN).first()
    if not test_university:
        test_university = University(
            name='Test University',
            clubName='Test AI Club',
            location='Development',
            email_domain=DEV_UNIVERSITY_DOMAIN,
            description='Development and testing university for local dev environment.',
            member_count=0,
            recent_posts=0,
            upcoming_events=0
        )
        db.session.add(test_university)
        db.session.commit()
        print("Created Test University for dev user.")

    # Create the dev user with admin privileges
    dev_user = User(
        email=DEV_USER_EMAIL,
        first_name='Dev',
        last_name='User',
        about_section='Development user for local testing. Auto-created by DEV_MODE.',
        location='Local Development',
        permission_level=ADMIN,
        university=test_university.name,
        post_count=0,
        follower_count=0,
        following_count=0
    )
    dev_user.set_password(DEV_USER_PASSWORD)
    dev_user.set_skills_list(['Development', 'Testing'])

    db.session.add(dev_user)
    db.session.commit()

    # Add dev user as member and president of Test University
    test_university.add_member(dev_user.id)
    UniversityRole.set_role(dev_user.id, test_university.id, UniversityRoles.PRESIDENT)
    create_initial_education(dev_user, test_university)
    db.session.commit()

    print(f"Created dev user: {DEV_USER_EMAIL} / {DEV_USER_PASSWORD}")
    return dev_user


def clear_existing_data():
    """Clear existing seed data (preserving any real data you want to keep)."""
    print("Clearing existing data...")
    # Delete in order to respect foreign key constraints
    # Delete child records first (those with foreign keys)
    Speaker.query.delete()  # References User + University
    EventAttendee.query.delete()  # References Event
    Event.query.delete()  # References User
    UserFollows.query.delete()
    UniversityRole.query.delete()
    Message.query.delete()
    Note.query.delete()
    Opportunity.query.delete()
    User.query.delete()
    University.query.delete()
    # Clear AI news data (chat messages first due to foreign keys)
    AINewsChatMessage.query.delete()
    AINewsSource.query.delete()
    AINewsStory.query.delete()
    AIResearchPaper.query.delete()
    db.session.commit()
    print("Existing data cleared.")


def seed_universities():
    """Create 6 universities with AI clubs."""
    print("Seeding universities...")

    universities_data = [
        {
            "name": "University of Oregon",
            "clubName": "AISA",
            "location": "Eugene, OR",
            "email_domain": "uoregon",
            "description": "The AI Student Association at University of Oregon brings together students passionate about artificial intelligence, machine learning, and data science."
        },
        {
            "name": "Stanford University",
            "clubName": "Stanford AI Club",
            "location": "Stanford, CA",
            "email_domain": "stanford",
            "description": "Stanford's premier student organization for AI enthusiasts, hosting workshops, research talks, and hackathons."
        },
        {
            "name": "MIT",
            "clubName": "MIT AI Society",
            "location": "Cambridge, MA",
            "email_domain": "mit",
            "description": "Connecting MIT students with AI research opportunities and industry partners."
        },
        {
            "name": "University of Colorado Boulder",
            "clubName": "CU Boulder AI",
            "location": "Boulder, CO",
            "email_domain": "colorado",
            "description": "CU Boulder's AI community fostering collaboration between students and the Boulder tech industry."
        },
        {
            "name": "UC Berkeley",
            "clubName": "Berkeley AI Research Students",
            "location": "Berkeley, CA",
            "email_domain": "berkeley",
            "description": "Student-led organization focused on AI research, ethics, and practical applications."
        },
        {
            "name": "Carnegie Mellon University",
            "clubName": "CMU AI Initiative",
            "location": "Pittsburgh, PA",
            "email_domain": "cmu",
            "description": "CMU's student hub for AI innovation, bridging robotics, NLP, and computer vision research."
        },
        {
            "name": "University of Washington",
            "clubName": "Husky AI",
            "location": "Seattle, WA",
            "email_domain": "uw",
            "description": "UW's AI community fostering collaboration between students and the Seattle tech industry."
        },
        # {
        #     "name": "University of Colorado Boulder",
        #     "clubName": "CU Boulder AI",
        #     "location": "Boulder, CO",
        #     "email_domain": "colorado",
        #     "description": "CU Boulder's AI community fostering collaboration between students and the Boulder tech industry."
        # }
    ]

    universities = []
    for data in universities_data:
        uni = University(
            name=data["name"],
            clubName=data["clubName"],
            location=data["location"],
            email_domain=data["email_domain"],
            description=data["description"],
            member_count=0,
            recent_posts=0,
            upcoming_events=random.randint(0, 5)
        )
        db.session.add(uni)
        universities.append(uni)

    db.session.commit()
    print(f"Created {len(universities)} universities.")
    return universities


def seed_users(universities):
    """Create 20 users distributed across universities."""
    print("Seeding users...")

    # Map email domains to university objects
    domain_to_uni = {uni.email_domain: uni for uni in universities}

    users_data = [
        # UO students (first user becomes president automatically)
        {
            "email": "osto@uoregon.edu",
            "first_name": "Oliver",
            "last_name": "Stoner-German",
            "about_section": "AI enthusiast passionate about machine learning and its applications.",
            "location": "Eugene, OR",
            "skills": ["Python", "PyTorch", "Machine Learning", "React"],
            "permission_level": ADMIN
        },
        {
            "email": "jsmith@uoregon.edu",
            "first_name": "Jordan",
            "last_name": "Smith",
            "about_section": "CS major interested in reinforcement learning.",
            "location": "Eugene, OR",
            "skills": ["Python", "TensorFlow"]
        },
        {
            "email": "mwilson@uoregon.edu",
            "first_name": "Maya",
            "last_name": "Wilson",
            "about_section": "Data science enthusiast exploring AI ethics.",
            "location": "Portland, OR",
            "skills": ["R", "Python", "SQL"]
        },
        # Stanford students
        {
            "email": "alee@stanford.edu",
            "first_name": "Alex",
            "last_name": "Lee",
            "about_section": "PhD candidate researching transformer architectures.",
            "location": "Palo Alto, CA",
            "skills": ["PyTorch", "JAX", "CUDA"]
        },
        {
            "email": "schen@stanford.edu",
            "first_name": "Sarah",
            "last_name": "Chen",
            "about_section": "Undergrad building AI-powered accessibility tools.",
            "location": "Stanford, CA",
            "skills": ["Python", "Swift", "CoreML"]
        },
        {
            "email": "rjohnson@stanford.edu",
            "first_name": "Ryan",
            "last_name": "Johnson",
            "about_section": "Exploring the intersection of AI and robotics.",
            "location": "Stanford, CA",
            "skills": ["ROS", "Python", "C++"]
        },
        # MIT students
        {
            "email": "npatel@mit.edu",
            "first_name": "Nadia",
            "last_name": "Patel",
            "about_section": "Working on AI safety and alignment research.",
            "location": "Cambridge, MA",
            "skills": ["Python", "Math", "Philosophy"]
        },
        {
            "email": "tkim@mit.edu",
            "first_name": "Tyler",
            "last_name": "Kim",
            "about_section": "Building neural network hardware accelerators.",
            "location": "Boston, MA",
            "skills": ["Verilog", "Python", "C"]
        },
        {
            "email": "lgarcia@mit.edu",
            "first_name": "Luna",
            "last_name": "Garcia",
            "about_section": "Passionate about democratizing AI education.",
            "location": "Cambridge, MA",
            "skills": ["Python", "JavaScript", "Teaching"]
        },
        # Berkeley students
        {
            "email": "dwang@berkeley.edu",
            "first_name": "David",
            "last_name": "Wang",
            "about_section": "Research assistant in the Berkeley AI Research lab.",
            "location": "Berkeley, CA",
            "skills": ["PyTorch", "Distributed Computing", "Python"]
        },
        {
            "email": "ehernandez@berkeley.edu",
            "first_name": "Elena",
            "last_name": "Hernandez",
            "about_section": "Focusing on fair and unbiased AI systems.",
            "location": "Oakland, CA",
            "skills": ["Python", "Statistics", "Fairlearn"]
        },
        {
            "email": "jthompson@berkeley.edu",
            "first_name": "Jake",
            "last_name": "Thompson",
            "about_section": "Full-stack developer integrating LLMs into products.",
            "location": "Berkeley, CA",
            "skills": ["TypeScript", "Python", "LangChain"]
        },
        # CMU students
        {
            "email": "abrown@cmu.edu",
            "first_name": "Aisha",
            "last_name": "Brown",
            "about_section": "Robotics PhD student working on manipulation.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "ROS", "Reinforcement Learning"]
        },
        {
            "email": "mzhang@cmu.edu",
            "first_name": "Michael",
            "last_name": "Zhang",
            "about_section": "NLP researcher specializing in multilingual models.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "Transformers", "Linguistics"]
        },
        {
            "email": "kwhite@cmu.edu",
            "first_name": "Katie",
            "last_name": "White",
            "about_section": "Combining art and AI for generative creativity.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "Stable Diffusion", "Processing"]
        },
        # UW students
        {
            "email": "jpark@uw.edu",
            "first_name": "James",
            "last_name": "Park",
            "about_section": "Working at the intersection of AI and healthcare.",
            "location": "Seattle, WA",
            "skills": ["Python", "TensorFlow", "Medical Imaging"]
        },
        {
            "email": "omartin@uw.edu",
            "first_name": "Olivia",
            "last_name": "Martin",
            "about_section": "Building conversational AI systems.",
            "location": "Seattle, WA",
            "skills": ["Python", "Rasa", "Dialogflow"]
        },
        {
            "email": "crodriguez@uw.edu",
            "first_name": "Carlos",
            "last_name": "Rodriguez",
            "about_section": "ML engineer focusing on recommendation systems.",
            "location": "Bellevue, WA",
            "skills": ["Python", "Spark", "RecSys"]
        },
        {
            "email": "etaylor@uw.edu",
            "first_name": "Emma",
            "last_name": "Taylor",
            "about_section": "Climate tech advocate using AI for sustainability.",
            "location": "Seattle, WA",
            "skills": ["Python", "Satellite Imagery", "GIS"]
        },
        {
            "email": "wlee@uw.edu",
            "first_name": "William",
            "last_name": "Lee",
            "about_section": "Security researcher exploring adversarial ML.",
            "location": "Seattle, WA",
            "skills": ["Python", "Security", "Adversarial ML"]
        },
        {
            "email": "alsa8624@colorado.edu",
            "first_name": "Alex",
            "last_name": "Savard",
            "about_section": "Computer science student interested in AI and machine learning.",
            "location": "Boulder, CO",
            "skills": ["Python", "Java", "C++"]
        }
    ]

    users = []
    for data in users_data:
        user = User(
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            about_section=data.get("about_section"),
            location=data.get("location"),
            permission_level=data.get("permission_level", 0),
            join_date=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
            post_count=0,
            follower_count=0,
            following_count=0
        )
        # All seeded users share the same password for easy testing
        user.set_password(SEED_USER_PASSWORD)
        user.set_skills_list(data.get("skills", []))

        # Set university based on email domain
        domain = data["email"].split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            user.university = domain_to_uni[domain].name

        db.session.add(user)
        users.append(user)

    db.session.commit()

    # Auto-populate education entries for users with universities
    for user in users:
        domain = user.email.split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            create_initial_education(user, domain_to_uni[domain])
    db.session.commit()

    print(f"Created {len(users)} users.")
    return users


def seed_university_memberships(users, universities):
    """Add users as members of their universities and assign roles."""
    print("Seeding university memberships and roles...")

    domain_to_uni = {uni.email_domain: uni for uni in universities}

    for user in users:
        domain = user.email.split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            uni = domain_to_uni[domain]
            uni.add_member(user.id)

            # Assign roles based on join order:
            # First user at each university becomes president
            if uni.member_count == 1:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.PRESIDENT)
            # Second user becomes executive
            elif uni.member_count == 2:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.EXECUTIVE)
            # Everyone else is a member
            else:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.MEMBER)

    db.session.commit()
    print("University memberships and roles assigned.")


def seed_notes(users):
    """Create 10 notes from various users."""
    print("Seeding notes...")

    notes_data = [
        {
            "title": "Getting Started with PyTorch",
            "content": "Here's a quick guide to getting started with PyTorch for deep learning. First, install it with pip: `pip install torch`. Then you can create your first tensor and start building neural networks. The key abstractions are Tensors (like NumPy arrays but with GPU support) and nn.Module for building models.",
            "tags": ["PyTorch", "Tutorial", "Deep Learning"]
        },
        {
            "title": "Understanding Transformers",
            "content": "Transformers have revolutionized NLP and beyond. The key innovation is the self-attention mechanism, which allows the model to weigh the importance of different parts of the input. Unlike RNNs, transformers can process all positions in parallel, making them much faster to train.",
            "tags": ["Transformers", "NLP", "Architecture"]
        },
        {
            "title": "AI Ethics Discussion Notes",
            "content": "From our last club meeting: We discussed the importance of considering bias in training data, the need for transparency in AI systems, and the challenge of defining 'fairness' mathematically. Key reading: 'Weapons of Math Destruction' by Cathy O'Neil.",
            "tags": ["Ethics", "Discussion", "Bias"]
        },
        {
            "title": "LangChain for Building LLM Apps",
            "content": "LangChain is an excellent framework for building applications with LLMs. It provides chains for common patterns, memory for conversation context, and agents for more complex reasoning. Great for prototyping RAG applications quickly.",
            "tags": ["LangChain", "LLMs", "Development"]
        },
        {
            "title": "Reinforcement Learning Study Group",
            "content": "Week 3 notes: We covered policy gradient methods including REINFORCE and Actor-Critic. The key insight is that we can optimize policies directly by estimating gradients through sampling. Next week: PPO and TRPO.",
            "tags": ["RL", "Study Group", "Policy Gradients"]
        },
        {
            "title": "Computer Vision Project Ideas",
            "content": "Brainstorming session results: 1) Campus accessibility mapping using object detection, 2) Plant disease detection for the agriculture department, 3) Sign language translation app, 4) Parking lot availability tracker. Voting next meeting!",
            "tags": ["Computer Vision", "Projects", "Ideas"]
        },
        {
            "title": "MLOps Best Practices",
            "content": "Key takeaways from the industry speaker: Version your data AND your models, use feature stores for consistency, monitor model drift in production, and automate retraining pipelines. Tools mentioned: MLflow, DVC, Weights & Biases.",
            "tags": ["MLOps", "Industry", "Best Practices"]
        },
        {
            "title": "Research Paper Review: CLIP",
            "content": "CLIP (Contrastive Language-Image Pre-training) by OpenAI learns visual concepts from natural language supervision. The key idea: train on 400M image-text pairs from the internet using contrastive learning. Enables zero-shot transfer to many vision tasks.",
            "tags": ["Paper Review", "CLIP", "Multimodal"]
        },
        {
            "title": "Hackathon Prep Resources",
            "content": "For the upcoming AI hackathon: Hugging Face for pretrained models, Gradio for quick demos, Colab for free GPUs, Vercel for deployment. Don't forget to prepare your dataset and have a clear problem statement before starting!",
            "tags": ["Hackathon", "Resources", "Tips"]
        },
        {
            "title": "Introduction to JAX",
            "content": "JAX is like NumPy but with automatic differentiation and GPU/TPU support. Key features: `jit` for compilation, `grad` for gradients, `vmap` for vectorization. Used by DeepMind for many research projects. Steeper learning curve than PyTorch but very powerful.",
            "tags": ["JAX", "Tutorial", "Google"]
        },
    ]

    notes = []
    for i, data in enumerate(notes_data):
        # Distribute notes among users
        author = users[i % len(users)]
        note = Note(
            title=data["title"],
            content=data["content"],
            author_id=author.id,
            likes=random.randint(0, 25),
            comments=random.randint(0, 10),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
        )
        note.set_tags_list(data["tags"])
        db.session.add(note)
        notes.append(note)

        # Update author's post count
        author.post_count += 1

    db.session.commit()
    print(f"Created {len(notes)} notes.")
    return notes


def seed_opportunities(users):
    """Create 5 sample opportunity posts."""
    print("Seeding opportunities...")

    opportunities_data = [
        {
            "title": "ML Research Assistant for NLP Project",
            "description": "Looking for a motivated undergraduate or graduate student to join our NLP research team. You'll be working on fine-tuning large language models for domain-specific applications in healthcare. Experience with PyTorch and Hugging Face Transformers preferred. This is a great opportunity to get hands-on research experience and potentially co-author a paper.",
            "compensation": "$20/hour, 10-15 hours/week",
            "university_only": True,
            "tags": ["On-site", "Paid", "Research"]
        },
        {
            "title": "AI Startup Co-founder - Computer Vision Focus",
            "description": "I'm building a startup that uses computer vision to help farmers detect crop diseases early. Looking for a technical co-founder who's passionate about using AI for social good. We've been accepted into a university incubator and have initial seed funding. Ideal partner has experience with object detection, mobile deployment, and isn't afraid to talk to customers.",
            "compensation": "Equity split negotiable, no salary initially",
            "university_only": False,
            "tags": ["Remote", "Unpaid", "Startup"]
        },
        {
            "title": "Hackathon Team - Climate Tech Challenge",
            "description": "Forming a team for the upcoming Climate AI Hackathon (Jan 15-17). We need 2 more members: ideally someone with frontend/demo skills and someone with ML experience. The theme is using AI to combat climate change. I have experience with satellite imagery analysis and want to build something around deforestation detection. Let's win this!",
            "compensation": None,
            "university_only": False,
            "tags": ["Hybrid", "Unpaid", "Hackathon"]
        },
        {
            "title": "Summer Research Internship - AI Safety Lab",
            "description": "Our AI safety lab is hiring summer interns to work on interpretability research. You'll be investigating how neural networks represent concepts internally, with the goal of making AI systems more transparent and trustworthy. Strong math background required (linear algebra, probability). Programming in Python/JAX. Remote-friendly with optional in-person collaboration.",
            "compensation": "$8,000/month stipend + housing assistance",
            "university_only": False,
            "tags": ["Hybrid", "Paid", "Research"]
        },
        {
            "title": "Mobile App Project - Campus Event Finder",
            "description": "Building a React Native app to help students discover AI/ML events on campus. Looking for 1-2 collaborators interested in mobile development. I'll handle the backend, need help with UI/UX and frontend. Great portfolio project! We meet weekly on Thursdays 6-8pm in the CS building.",
            "compensation": None,
            "university_only": True,
            "tags": ["On-site", "Unpaid", "Project"]
        },
    ]

    opportunities = []
    for i, data in enumerate(opportunities_data):
        # Distribute opportunities among users
        author = users[i % len(users)]
        opp = Opportunity(
            title=data["title"],
            description=data["description"],
            compensation=data["compensation"],
            university_only=data["university_only"],
            author_id=author.id,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
        )
        opp.set_tags_list(data["tags"])
        db.session.add(opp)
        opportunities.append(opp)

    db.session.commit()
    print(f"Created {len(opportunities)} opportunities.")
    return opportunities


def seed_messages(users):
    """Create some sample messages between users."""
    print("Seeding messages...")

    message_templates = [
        "Hey! I saw your post about {}. Would love to chat more about it.",
        "Are you coming to the next club meeting?",
        "Thanks for sharing those resources!",
        "I'm working on a similar project. Want to collaborate?",
        "Great presentation yesterday!",
        "Do you have any tips for getting started with {}?",
        "Let me know if you need help with your research.",
        "The workshop was really helpful, thanks for organizing!",
    ]

    topics = ["transformers", "reinforcement learning", "computer vision", "NLP", "MLOps"]

    messages = []
    # Create 12 messages between random pairs of users
    for _ in range(12):
        sender = random.choice(users)
        recipient = random.choice([u for u in users if u.id != sender.id])

        template = random.choice(message_templates)
        if "{}" in template:
            content = template.format(random.choice(topics))
        else:
            content = template

        msg = Message(
            sender_id=sender.id,
            recipient_id=recipient.id,
            content=content,
            is_read=random.choice([True, False]),
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 168))
        )
        db.session.add(msg)
        messages.append(msg)

    db.session.commit()
    print(f"Created {len(messages)} messages.")
    return messages


def seed_follows(users):
    """Create some follow relationships between users."""
    print("Seeding follow relationships...")

    follows = []
    # Each user follows 2-5 random other users
    for user in users:
        num_following = random.randint(2, 5)
        to_follow = random.sample([u for u in users if u.id != user.id], num_following)

        for followed in to_follow:
            follow = UserFollows(
                follower_id=user.id,
                following_id=followed.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90))
            )
            db.session.add(follow)
            follows.append(follow)

            # Update counts
            user.following_count += 1
            followed.follower_count += 1

    db.session.commit()
    print(f"Created {len(follows)} follow relationships.")
    return follows


def seed_ai_news():
    """Create sample AI news stories and research papers."""
    print("Seeding AI news content...")

    batch_id = "dev-seed-batch"

    # Sample news stories
    stories_data = [
        {
            "title": "OpenAI Releases GPT-5 with Enhanced Reasoning Capabilities",
            "summary": "OpenAI has unveiled GPT-5, their latest large language model featuring significant improvements in logical reasoning and multi-step problem solving. The model demonstrates near-human performance on complex mathematical proofs and shows remarkable ability to maintain context across extended conversations. Early benchmarks suggest a 40% improvement over GPT-4 on reasoning-heavy tasks.",
            "image_url": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
            "emoji": "🤖",
            "sources": [
                {"url": "https://example.com/gpt5-release", "source_name": "TechCrunch"},
                {"url": "https://example.com/gpt5-analysis", "source_name": "MIT Technology Review"}
            ]
        },
        {
            "title": "Google DeepMind Achieves Breakthrough in Protein Folding Prediction",
            "summary": "DeepMind's AlphaFold 3 has achieved unprecedented accuracy in predicting protein structures, including complex protein-protein interactions. The system can now model how proteins interact with DNA, RNA, and small molecules, opening new avenues for drug discovery and understanding disease mechanisms.",
            "image_url": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800",
            "emoji": "🧬",
            "sources": [
                {"url": "https://example.com/alphafold3", "source_name": "Nature"},
                {"url": "https://example.com/protein-ai", "source_name": "Science Daily"}
            ]
        },
        {
            "title": "EU Passes Comprehensive AI Regulation Framework",
            "summary": "The European Union has finalized its AI Act, establishing the world's first comprehensive regulatory framework for artificial intelligence. The legislation categorizes AI systems by risk level and imposes strict requirements on high-risk applications in healthcare, education, and law enforcement. Companies have 24 months to comply.",
            "image_url": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
            "emoji": "⚖️",
            "sources": [
                {"url": "https://example.com/eu-ai-act", "source_name": "Reuters"},
                {"url": "https://example.com/ai-regulation", "source_name": "The Verge"}
            ]
        }
    ]

    # Sample research papers
    papers_data = [
        {
            "title": "Scaling Laws for Neural Language Models: A Comprehensive Analysis",
            "authors": "Chen, Williams, et al.",
            "summary": "This paper provides a detailed analysis of how language model performance scales with compute, data, and parameters. The researchers find predictable relationships that can guide efficient allocation of training resources.\n\nModel performance follows power-law scaling with compute budget. Data quality matters more than quantity beyond certain thresholds. Optimal model size depends on available compute.",
            "paper_url": "https://arxiv.org/abs/example1",
            "source_name": "arXiv",
            "emoji": "📈"
        },
        {
            "title": "Attention Is All You Need: Revisited for Multimodal Learning",
            "authors": "Park, Johnson, Garcia",
            "summary": "Researchers extend the transformer architecture to efficiently process multiple modalities simultaneously, achieving state-of-the-art results on vision-language tasks with 30% fewer parameters than previous approaches.\n\nCross-modal attention mechanisms can share representations efficiently. Pre-training on aligned multimodal data improves downstream performance. The architecture generalizes to audio and video modalities.",
            "paper_url": "https://arxiv.org/abs/example2",
            "source_name": "NeurIPS 2024",
            "emoji": "👁️"
        },
        {
            "title": "Reinforcement Learning from Human Feedback: Best Practices and Pitfalls",
            "authors": "Smith, Lee, Patel, et al.",
            "summary": "A comprehensive study examining RLHF implementations across major language models, identifying common failure modes and proposing improved training procedures that reduce reward hacking.\n\nReward model overoptimization is a persistent challenge. Diverse human feedback pools improve robustness. Iterative RLHF with fresh data outperforms single-stage training.",
            "paper_url": "https://arxiv.org/abs/example3",
            "source_name": "ICML 2024",
            "emoji": "🎯"
        }
    ]

    stories = []
    for data in stories_data:
        story = AINewsStory(
            title=data["title"],
            summary=data["summary"],
            batch_id=batch_id,
            image_url=data.get("image_url"),
            emoji=data.get("emoji")
        )
        db.session.add(story)
        db.session.flush()  # Get the story ID for sources

        for source_data in data["sources"]:
            source = AINewsSource(
                story_id=story.id,
                url=source_data["url"],
                source_name=source_data["source_name"],
            )
            db.session.add(source)

        stories.append(story)

    papers = []
    for data in papers_data:
        paper = AIResearchPaper(
            title=data["title"],
            authors=data["authors"],
            summary=data["summary"],
            paper_url=data["paper_url"],
            source_name=data["source_name"],
            batch_id=batch_id,
            emoji=data.get("emoji")
        )
        db.session.add(paper)
        papers.append(paper)

    db.session.commit()
    print(f"Created {len(stories)} news stories and {len(papers)} research papers.")
    return stories, papers


def seed_speakers(users, universities):
    """Create sample guest speaker contacts."""
    print("Seeding speakers...")

    domain_to_uni = {uni.email_domain: uni for uni in universities}

    # Find executives/presidents to be the ones who added speakers
    executive_users = []
    for user in users:
        domain = user.email.split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            uni = domain_to_uni[domain]
            role = UniversityRole.get_role(user.id, uni.id)
            if role and role.role >= UniversityRoles.EXECUTIVE:
                executive_users.append((user, uni))

    speakers_data = [
        {
            "name": "Dr. Fei-Fei Li",
            "position": "Professor of Computer Science",
            "organization": "Stanford University",
            "email": "feifeili@stanford.edu",
            "linkedin_url": "https://linkedin.com/in/faboretum",
            "notes": "Co-director of Stanford HAI. Great for talks on computer vision and AI ethics. Prefers 45-min format.",
        },
        {
            "name": "Dr. Andrew Ng",
            "position": "Founder & CEO",
            "organization": "DeepLearning.AI",
            "email": "andrew@deeplearning.ai",
            "phone": "(650) 555-0142",
            "linkedin_url": "https://linkedin.com/in/andrewyng",
            "notes": "Excellent speaker for introductory AI topics. Very student-friendly. Books 2-3 months in advance.",
        },
        {
            "name": "Dr. Timnit Gebru",
            "position": "Founder & Executive Director",
            "organization": "DAIR Institute",
            "email": "timnit@dairinstitute.org",
            "linkedin_url": "https://linkedin.com/in/timnit-gebru",
            "notes": "Expert on AI ethics and fairness. Passionate about diversity in tech. Prefers panel or Q&A format.",
        },
        {
            "name": "Dr. Yann LeCun",
            "position": "VP & Chief AI Scientist",
            "organization": "Meta",
            "email": "ylecun@meta.com",
            "linkedin_url": "https://linkedin.com/in/yann-lecun",
            "notes": "Turing Award winner. Great for deep learning fundamentals talks. Limited availability.",
        },
        {
            "name": "Rachel Thomas",
            "position": "Co-founder",
            "organization": "fast.ai",
            "email": "rachel@fast.ai",
            "linkedin_url": "https://linkedin.com/in/rachel-thomas-ai",
            "notes": "Focuses on practical deep learning and AI accessibility. Great for workshop-style sessions.",
        },
        {
            "name": "Dr. Percy Liang",
            "position": "Associate Professor of Computer Science",
            "organization": "Stanford University",
            "email": "pliang@cs.stanford.edu",
            "phone": "(650) 555-0198",
            "notes": "Expert on foundation models and NLP. Runs the HELM benchmark. Good for research-oriented talks.",
        },
        {
            "name": "Sarah Guo",
            "position": "Founding Partner",
            "organization": "Conviction Capital",
            "email": "sarah@conviction.com",
            "linkedin_url": "https://linkedin.com/in/sarahguo",
            "notes": "AI venture capitalist. Great for talks on AI startups and entrepreneurship. Very engaging speaker.",
        },
        {
            "name": "Dr. Dario Amodei",
            "position": "CEO",
            "organization": "Anthropic",
            "linkedin_url": "https://linkedin.com/in/dario-amodei",
            "notes": "Expert on AI safety. Prefers moderated discussion format. Requires 3+ months advance booking.",
        },
    ]

    speakers = []
    for i, data in enumerate(speakers_data):
        # Distribute speakers among executive users
        adder, uni = executive_users[i % len(executive_users)]
        speaker = Speaker(
            name=data["name"],
            position=data["position"],
            organization=data.get("organization"),
            email=data.get("email"),
            phone=data.get("phone"),
            linkedin_url=data.get("linkedin_url"),
            notes=data.get("notes"),
            university_id=uni.id,
            added_by_id=adder.id,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
        )
        db.session.add(speaker)
        speakers.append(speaker)

    db.session.commit()
    print(f"Created {len(speakers)} speakers.")
    return speakers


def seed_all():
    """Run all seed functions."""
    print("\n" + "="*50)
    print("AIxU Development Seed Data")
    print("="*50 + "\n")

    clear_existing_data()

    universities = seed_universities()
    users = seed_users(universities)
    seed_university_memberships(users, universities)
    seed_notes(users)
    seed_opportunities(users)
    seed_messages(users)
    seed_follows(users)
    seed_ai_news()
    seed_speakers(users, universities)

    print("\n" + "="*50)
    print("Seeding complete!")
    print("="*50)
    print(f"\nAll seeded users share password: {SEED_USER_PASSWORD}")
    print("First user at each university is president, second is executive.")
    print("="*50 + "\n")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_all()
