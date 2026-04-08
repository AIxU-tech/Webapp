/**
 * AttendEventPage
 *
 * Mobile-first standalone page for event attendance check-in via QR code.
 * Uses PlasmaBackground with a centered card, matching auth page styling.
 * Displays the university club logo prominently when available.
 *
 * Inspired by the AttendanceTracker reference design:
 * - Staggered fade-in animations for sequential element entrance
 * - Subtle logo glow pulse behind the club logo
 * - Sparkle decorations on the success screen
 * - Warm, inviting copy and generous spacing
 *
 * States: loading, error, past event, already checked in, form, success.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAttendanceEvent, useSubmitAttendance, useUniversities, usePageTitle } from '../hooks';
import { FormInput, GradientButton, Alert } from '../components/ui';
import { BrainCircuitIcon, CheckCircleIcon, CalendarIcon, MapPinIcon, ClockIcon, AlertCircleIcon, AlertTriangleIcon } from '../components/icons';
import { GRADIENT_PRIMARY } from '../config/styles';
import { PlasmaBackground } from '../components/layout';
import { parseUtcDate } from '../utils/time';
import { extractEduSubdomain, isValidRegistrationEmail, isWhitelistedEmail } from '../utils/email';

// ---------------------------------------------------------------------------
// Animation keyframes injected once into the document head
// ---------------------------------------------------------------------------

const STYLE_ID = 'attend-event-animations';

function ensureAnimationStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes attend-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes attend-logo-ring-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99, 155, 255, 0.0); }
      50%      { box-shadow: 0 0 24px 4px rgba(99, 155, 255, 0.25); }
    }
    @keyframes attend-sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50%      { opacity: 1; transform: scale(1) rotate(20deg); }
    }
    @keyframes attend-glow-pulse {
      0%, 100% { opacity: 0.15; transform: scale(1); }
      50%      { opacity: 0.3;  transform: scale(1.1); }
    }
    .attend-fade-in {
      opacity: 0;
      animation: attend-fade-in 0.5s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventTime(startTime, endTime) {
  const start = parseUtcDate(startTime);
  if (!start) return '';
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
  let str = start.toLocaleString('en-US', options);
  if (endTime) {
    const end = parseUtcDate(endTime);
    if (end) {
      str += ` \u2013 ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
  }
  return str;
}

/** Wrapper that applies a staggered fade-in animation. */
function FadeIn({ delay = 0, children, className = '' }) {
  return (
    <div
      className={`attend-fade-in ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Sparkle({ delay, x, y }) {
  return (
    <div
      className="absolute text-primary/60 text-xl pointer-events-none select-none"
      style={{
        left: x,
        top: y,
        animation: `attend-sparkle 2s ease-in-out ${delay}s infinite`,
      }}
    >
      &#10022;
    </div>
  );
}

function ClubLogo({ event }) {
  const [imgError, setImgError] = useState(false);
  const hasLogo = event?.universityLogoUrl && !imgError;

  if (hasLogo) {
    return (
      <div className="relative mx-auto w-28 h-28">
        {/* Soft glow behind logo */}
        <div
          className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-[1.6]"
          style={{ animation: 'attend-glow-pulse 4s ease-in-out infinite' }}
        />
        {/* Logo circle with ring pulse */}
        <div
          className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/30 shadow-xl"
          style={{ animation: 'attend-logo-ring-pulse 3s ease-in-out infinite' }}
        >
          <img
            src={event.universityLogoUrl}
            alt={`${event.universityName || 'University'} logo`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`w-12 h-12 ${GRADIENT_PRIMARY} rounded-xl flex items-center justify-center mr-3`}>
        <span className="text-white"><BrainCircuitIcon size="lg" /></span>
      </div>
      <span className="text-2xl font-bold text-foreground">AIxU</span>
    </div>
  );
}

function EventDetailsCard({ event }) {
  if (!event) return null;
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
      <h3 className="font-semibold text-foreground">{event.title}</h3>
      <div className="flex flex-col gap-1 text-muted-foreground">
        {event.startTime && (
          <span className="flex items-center gap-2">
            <span className="flex-shrink-0"><ClockIcon size="sm" /></span>
            {formatEventTime(event.startTime, event.endTime)}
          </span>
        )}
        {event.location && (
          <span className="flex items-center gap-2">
            <span className="flex-shrink-0"><MapPinIcon size="sm" /></span>
            {event.location}
          </span>
        )}
      </div>
    </div>
  );
}

function SuccessCheckmark() {
  return (
    <div className={`mx-auto w-20 h-20 ${GRADIENT_PRIMARY} rounded-full flex items-center justify-center shadow-lg`}>
      <CheckCircleIcon className="h-10 w-10 text-white" />
    </div>
  );
}

function GoToAppLink({ user }) {
  return (
    <Link
      to={user ? '/community' : '/'}
      className="text-sm text-primary hover:underline transition-colors"
    >
      Go to AIxU
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AttendEventPage() {
  const { token } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError } = useAttendanceEvent(token);
  const submitMutation = useSubmitAttendance();
  const { data: universities = [] } = useUniversities();

  usePageTitle('Check In');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [detectedUniversity, setDetectedUniversity] = useState(null);

  // University domain lookup map (mirrors registration logic)
  const universityDomainMap = useMemo(() => {
    const map = new Map();
    universities.forEach((uni) => {
      if (uni.emailDomain) map.set(uni.emailDomain.toLowerCase(), uni);
    });
    return map;
  }, [universities]);

  const findUniversityByEmail = useCallback((emailVal) => {
    const subdomain = extractEduSubdomain(emailVal);
    if (!subdomain) return null;
    let uni = universityDomainMap.get(subdomain);
    if (uni) return uni;
    if (subdomain.includes('.')) {
      uni = universityDomainMap.get(subdomain.split('.').pop());
      if (uni) return uni;
    }
    return null;
  }, [universityDomainMap]);

  const handleEmailChange = useCallback((e) => {
    const val = e.target.value;
    setEmail(val);
    if (universityDomainMap.size > 0) {
      setDetectedUniversity(findUniversityByEmail(val));
    }
  }, [universityDomainMap, findUniversityByEmail]);

  // Show university status when email looks like a valid .edu
  const showUniversityStatus = email && isValidRegistrationEmail(email);
  const isWhitelisted = isWhitelistedEmail(email);

  // Inject animation keyframes on mount
  useEffect(() => {
    ensureAnimationStyles();
  }, []);

  useEffect(() => {
    if (data?.autoFill && !hasAutoFilled) {
      setName(data.autoFill.name || '');
      setEmail(data.autoFill.email || '');
      setHasAutoFilled(true);
    }
  }, [data, hasAutoFilled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter your name.');
      return;
    }

    // Validate email if provided: must be .edu from a registered university
    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      if (!isValidRegistrationEmail(trimmedEmail)) {
        setFormError('Please use a .edu email address.');
        return;
      }
      if (!isWhitelistedEmail(trimmedEmail) && !findUniversityByEmail(trimmedEmail)) {
        setFormError('No university matches your email domain.');
        return;
      }
    }

    submitMutation.mutate(
      { token, data: { name: trimmedName, email: trimmedEmail || undefined } },
      {
        onSuccess: () => setIsSubmitted(true),
        onError: (err) => setFormError(err.message || 'Failed to submit attendance.'),
      }
    );
  };

  const event = data?.event;
  const alreadyCheckedIn = data?.alreadyCheckedIn;
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // -------------------------------------------------------------------
  // State renderers
  // -------------------------------------------------------------------

  const renderLoading = () => (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Loading event...</p>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-4 py-6">
      <FadeIn>
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive"><AlertCircleIcon size="xl" /></span>
        </div>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h2 className="text-2xl font-bold text-foreground">Invalid Link</h2>
      </FadeIn>
      <FadeIn delay={0.2}>
        <p className="text-muted-foreground">
          This attendance link is invalid or has expired. Please ask the event organizer for a new QR code.
        </p>
      </FadeIn>
      <FadeIn delay={0.3}>
        <div className="pt-2">
          <GoToAppLink user={user} />
        </div>
      </FadeIn>
    </div>
  );

  const renderPastEvent = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <FadeIn>
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground"><CalendarIcon size="xl" /></span>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="text-2xl font-bold text-foreground">Event Has Ended</h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="text-muted-foreground">
            This event is no longer accepting check-ins.
          </p>
        </FadeIn>
      </div>
      <FadeIn delay={0.25}>
        <EventDetailsCard event={event} />
      </FadeIn>
      <FadeIn delay={0.35}>
        <div className="text-center pt-2">
          <GoToAppLink user={user} />
        </div>
      </FadeIn>
    </div>
  );

  const renderAlreadyCheckedIn = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-4">
        <FadeIn>
          <SuccessCheckmark />
        </FadeIn>
        <FadeIn delay={0.15}>
          <h2 className="text-2xl font-bold text-foreground">Already Checked In!</h2>
        </FadeIn>
        <FadeIn delay={0.25}>
          <p className="text-muted-foreground">
            You've already marked your attendance for this event.
          </p>
        </FadeIn>
      </div>
      <FadeIn delay={0.35}>
        <div className="text-center pt-2">
          <GoToAppLink user={user} />
        </div>
      </FadeIn>
    </div>
  );

  const renderSuccess = () => (
    <div className="relative space-y-6 py-4">
      {/* Sparkle decorations */}
      <Sparkle delay={0} x="8%" y="5%" />
      <Sparkle delay={0.4} x="88%" y="10%" />
      <Sparkle delay={0.8} x="12%" y="78%" />
      <Sparkle delay={1.2} x="85%" y="72%" />

      <div className="text-center space-y-4">
        <FadeIn>
          <SuccessCheckmark />
        </FadeIn>
        <FadeIn delay={0.15}>
          <h2 className="text-2xl font-bold text-foreground">
            You're in{firstName ? `, ${firstName}` : ''}!
          </h2>
        </FadeIn>
        <FadeIn delay={0.25}>
          <p className="text-muted-foreground">
            Attendance recorded successfully
          </p>
        </FadeIn>
        <FadeIn delay={0.35}>
          <div className={`w-12 h-1 mx-auto rounded-full ${GRADIENT_PRIMARY}`} />
        </FadeIn>
        <FadeIn delay={0.45}>
          <p className="text-lg font-medium text-foreground">
            Enjoy the event! 🎉
          </p>
        </FadeIn>
      </div>

      <FadeIn delay={0.55}>
        <div className="text-center pt-2">
          <GoToAppLink user={user} />
        </div>
      </FadeIn>

      {!user && (
        <FadeIn delay={0.65}>
          <div className="text-center space-y-3 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Save your info for faster check-ins
            </p>
            <GradientButton
              as={Link}
              to={(() => {
                const params = new URLSearchParams();
                if (email.trim()) params.set('email', email.trim());
                if (firstName) params.set('firstName', firstName);
                if (lastName) params.set('lastName', lastName);
                const qs = params.toString();
                return qs ? `/register?${qs}` : '/register';
              })()}
              size="sm"
            >
              Create Account
            </GradientButton>
          </div>
        </FadeIn>
      )}
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <FadeIn>
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Hey there! 👋</h2>
          <p className="text-muted-foreground">Let's get you checked in</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <EventDetailsCard event={event} />
      </FadeIn>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <FadeIn>
            <Alert type="error">{formError}</Alert>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <div>
            <label htmlFor="attend-name" className="block text-sm font-medium text-foreground mb-1.5">
              Your Name <span className="text-destructive">*</span>
            </label>
            <FormInput
              id="attend-name"
              name="name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div>
            <label htmlFor="attend-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FormInput
                id="attend-email"
                type="email"
                name="email"
                placeholder="student@university.edu"
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
                className={showUniversityStatus ? 'pr-10' : ''}
              />
              {showUniversityStatus && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  title={
                    detectedUniversity
                      ? detectedUniversity.name
                      : isWhitelisted
                        ? 'Whitelisted email'
                        : 'No matching university'
                  }
                >
                  {detectedUniversity ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : isWhitelisted ? (
                    <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <GradientButton
            type="submit"
            className="w-full"
            loading={submitMutation.isPending}
            loadingText="Checking in..."
          >
            Mark Attendance
          </GradientButton>
        </FadeIn>
      </form>
    </div>
  );

  // -------------------------------------------------------------------
  // Pick the right content renderer
  // -------------------------------------------------------------------

  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (isError || !event) return renderError();
    if (event.isPast) return renderPastEvent();
    if (alreadyCheckedIn && !isSubmitted) return renderAlreadyCheckedIn();
    if (isSubmitted) return renderSuccess();
    return renderForm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.35}
      />

      <div className="relative z-10 w-full max-w-md px-6 py-12">
        <div className="bg-card border border-border rounded-xl shadow-card p-8">
          {/* Club logo or AIxU branding */}
          <FadeIn>
            <div className="flex justify-center mb-6">
              <ClubLogo event={event} />
            </div>
          </FadeIn>

          {/* University name below logo when logo is shown */}
          {event?.universityLogoUrl && event?.universityName && (
            <FadeIn delay={0.05}>
              <p className="text-center text-sm text-muted-foreground mb-6">
                {event.universityName}
              </p>
            </FadeIn>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
