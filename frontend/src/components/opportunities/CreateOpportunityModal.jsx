/**
 * CreateOpportunityModal Component
 *
 * Modal for creating new opportunities with title, description, location,
 * compensation, tags, and visibility settings.
 *
 * Features:
 * - Title and description inputs with validation
 * - Location type selection (Remote, Hybrid, On-site)
 * - Paid/Unpaid compensation toggle
 * - Optional compensation details
 * - Category tag selection
 * - University-only visibility toggle
 * - Character count display
 * - Loading state during submission
 *
 * @component
 */

import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import TagSelector from '../ui/TagSelector';
import GradientButton from '../ui/GradientButton';
import Alert from '../ui/Alert';
import { TagGroup, ToggleTag } from '../ui/Tag';
import { ClockIcon } from '../icons';

/**
 * Location type tags (mutually exclusive)
 */
const LOCATION_TAGS = ['Remote', 'Hybrid', 'On-site'];

/**
 * Optional category tags for opportunities
 */
const CATEGORY_TAGS = ['Project', 'Research', 'Startup', 'Hackathon'];

/**
 * CreateOpportunityModal Props
 * @typedef {Object} CreateOpportunityModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {Function} onClose - Callback when modal is closed
 * @property {Function} onCreate - Callback when opportunity is created, receives {title, description, compensation, universityOnly, tags}
 * @property {boolean} isCreating - Whether the opportunity is currently being created
 * @property {string|null} error - Error message from failed creation attempt
 */
export default function CreateOpportunityModal({
    isOpen,
    onClose,
    onCreate,
    isCreating = false,
    error = null,
}) {
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [compensation, setCompensation] = useState('');
    const [universityOnly, setUniversityOnly] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [isPaid, setIsPaid] = useState(null); // null = not selected, true = paid, false = unpaid
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [validationError, setValidationError] = useState(null);

    /**
     * Reset form to initial state
     */
    function resetForm() {
        setTitle('');
        setDescription('');
        setCompensation('');
        setUniversityOnly(false);
        setSelectedLocation('');
        setIsPaid(null);
        setSelectedCategories([]);
        setValidationError(null);
    }

    /**
     * Handle modal close
     * Resets form and calls parent onClose callback
     */
    function handleClose() {
        resetForm();
        onClose();
    }

    /**
     * Handle form submission
     * Validates inputs and calls onCreate callback with form data
     */
    function handleSubmit(e) {
        e.preventDefault();
        setValidationError(null);

        // Validate required fields
        if (!title.trim() || !description.trim()) {
            setValidationError('Please fill in both title and description');
            return;
        }

        if (!selectedLocation) {
            setValidationError('Please select a location type (Remote, Hybrid, or On-site)');
            return;
        }

        if (isPaid === null) {
            setValidationError('Please indicate if this opportunity is Paid or Unpaid');
            return;
        }

        // Build tags array
        const tags = [selectedLocation, isPaid ? 'Paid' : 'Unpaid', ...selectedCategories];

        // Call parent onCreate with opportunity data
        onCreate({
            title: title.trim(),
            description: description.trim(),
            compensation: isPaid ? compensation.trim() : '',
            universityOnly,
            tags,
        });
    }

    // Calculate character count
    const charCount = title.length + description.length;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Post an Opportunity"
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="p-6">
                {/* Title */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                    <input
                        type="text"
                        placeholder="e.g., Research Assistant Needed for ML Project"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Description */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
                    <textarea
                        placeholder={"Recommended info:\n• What you're working on\n• What roles/skills you need\n• Expected time commitment\n• How to get involved"}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows={6}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                </div>

                {/* Location Type */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Location Type *</label>
                    <TagGroup>
                        {LOCATION_TAGS.map(loc => (
                            <ToggleTag
                                key={loc}
                                selected={selectedLocation === loc}
                                onClick={() => setSelectedLocation(loc)}
                                size="lg"
                            >
                                {loc}
                            </ToggleTag>
                        ))}
                    </TagGroup>
                </div>

                {/* Paid/Unpaid */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Compensation *</label>
                    <TagGroup>
                        <ToggleTag
                            selected={isPaid === true}
                            onClick={() => setIsPaid(true)}
                            variant="success"
                            size="lg"
                        >
                            Paid
                        </ToggleTag>
                        <ToggleTag
                            selected={isPaid === false}
                            onClick={() => setIsPaid(false)}
                            variant="secondary"
                            size="lg"
                        >
                            Unpaid
                        </ToggleTag>
                    </TagGroup>
                </div>

                {/* Compensation Details (only shown if Paid) */}
                {isPaid && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-foreground mb-2">Compensation Details</label>
                        <input
                            type="text"
                            placeholder="e.g., $20/hour, $500 stipend, equity offered"
                            value={compensation}
                            onChange={(e) => setCompensation(e.target.value)}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                )}

                {/* University Only Toggle */}
                <div className="mb-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={universityOnly}
                            onChange={(e) => setUniversityOnly(e.target.checked)}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-foreground">
                            Only visible to members of my university
                        </span>
                    </label>
                </div>

                {/* Category Tags */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Categories (optional)</label>
                    <TagSelector
                        tags={CATEGORY_TAGS}
                        selected={selectedCategories}
                        onChange={setSelectedCategories}
                        multiple
                    />
                </div>

                {/* Error Display */}
                {(error || validationError) && (
                    <div className="mb-4">
                        <Alert variant="error">
                            {error || validationError}
                        </Alert>
                    </div>
                )}

                {/* Submit Row */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground flex items-center">
                        <ClockIcon />
                        <span className="ml-1">{charCount} characters</span>
                    </div>

                    <GradientButton
                        type="submit"
                        size="sm"
                        loading={isCreating}
                        loadingText="Posting..."
                    >
                        Post Opportunity
                    </GradientButton>
                </div>
            </form>
        </BaseModal>
    );
}

