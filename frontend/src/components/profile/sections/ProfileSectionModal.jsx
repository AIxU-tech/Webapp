/**
 * ProfileSectionModal
 *
 * Shared modal for creating/editing profile section entries
 * (Education, Experience, Projects). Renders dynamic fields
 * based on the `sectionType` prop.
 */

import { useState, useEffect } from 'react';
import { BaseModal, GradientButton, SecondaryButton, CitySearchInput, Alert } from '../../ui';
import { TrashIcon } from '../../icons';

const SECTION_CONFIG = {
  education: {
    title: { add: 'Add Education', edit: 'Edit Education' },
    fields: [
      { name: 'institution', label: 'Institution', placeholder: 'e.g. MIT', required: true },
      { name: 'degree', label: 'Degree', placeholder: 'e.g. B.S. Computer Science', required: true },
      { name: 'field_of_study', label: 'Field of Study', placeholder: 'e.g. Artificial Intelligence' },
      { name: 'start_date', label: 'Start Date', type: 'month', required: true },
      { name: 'end_date', label: 'End Date', type: 'month', hasCurrentToggle: true, currentLabel: 'I currently study here' },
      { name: 'gpa', label: 'GPA', type: 'gpa', placeholder: 'e.g. 3.85' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Activities, societies, achievements...' },
    ],
  },
  experience: {
    title: { add: 'Add Experience', edit: 'Edit Experience' },
    fields: [
      { name: 'title', label: 'Title', placeholder: 'e.g. Machine Learning Engineer', required: true },
      { name: 'company', label: 'Company', placeholder: 'e.g. OpenAI', required: true },
      { name: 'location', label: 'Location', type: 'city', placeholder: 'Search for a city...' },
      { name: 'start_date', label: 'Start Date', type: 'month', required: true },
      { name: 'end_date', label: 'End Date', type: 'month', hasCurrentToggle: true, currentLabel: 'I currently work here' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe your role and responsibilities...' },
    ],
  },
  project: {
    title: { add: 'Add Project', edit: 'Edit Project' },
    fields: [
      { name: 'title', label: 'Title', placeholder: 'e.g. AI-Powered Study Assistant', required: true },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What does this project do?' },
      { name: 'url', label: 'Project URL', placeholder: 'https://github.com/...' },
      { name: 'technologies', label: 'Technologies', placeholder: 'e.g. Python, PyTorch, React (comma-separated)', type: 'tags' },
      { name: 'start_date', label: 'Start Date', type: 'month' },
      { name: 'end_date', label: 'End Date', type: 'month', hasCurrentToggle: true, currentLabel: 'Ongoing project' },
    ],
  },
};

function monthToIso(monthValue) {
  if (!monthValue) return null;
  return `${monthValue}-01`;
}

function isoToMonth(isoDate) {
  if (!isoDate) return '';
  return isoDate.substring(0, 7);
}

export default function ProfileSectionModal({
  isOpen,
  onClose,
  sectionType,
  entry = null,
  onSave,
  onDelete,
}) {
  const config = SECTION_CONFIG[sectionType];
  const isEditing = !!entry;
  const [validationError, setValidationError] = useState(null);

  const getInitialValues = () => {
    if (!entry) {
      const vals = {};
      config.fields.forEach((f) => {
        if (f.type === 'tags') vals[f.name] = '';
        else vals[f.name] = '';
      });
      vals._isCurrent = false;
      return vals;
    }

    const vals = {};
    config.fields.forEach((f) => {
      if (f.type === 'month') {
        vals[f.name] = isoToMonth(entry[f.name]);
      } else if (f.type === 'tags') {
        vals[f.name] = Array.isArray(entry[f.name]) ? entry[f.name].join(', ') : '';
      } else if (f.type === 'gpa') {
        vals[f.name] = entry[f.name] != null ? String(entry[f.name]) : '';
      } else {
        vals[f.name] = entry[f.name] || '';
      }
    });
    const endDateField = config.fields.find((f) => f.hasCurrentToggle);
    vals._isCurrent = endDateField ? !entry[endDateField.name] && !!entry.start_date : false;
    return vals;
  };

  const [formData, setFormData] = useState(getInitialValues);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialValues());
      setValidationError(null);
    }
  }, [isOpen, entry]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationError) setValidationError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    // Date range validation
    const startField = config.fields.find((f) => f.name === 'start_date');
    const endField = config.fields.find((f) => f.hasCurrentToggle);
    if (startField && endField && !formData._isCurrent) {
      const startVal = formData.start_date;
      const endVal = formData.end_date;
      if (startVal && endVal && endVal < startVal) {
        setValidationError('End date cannot be before start date');
        return;
      }
    }

    // GPA validation
    const gpaField = config.fields.find((f) => f.type === 'gpa');
    if (gpaField && formData[gpaField.name] !== '') {
      const gpaNum = parseFloat(formData[gpaField.name]);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 5) {
        setValidationError('GPA must be a number between 0.0 and 5.0');
        return;
      }
    }

    const payload = {};
    config.fields.forEach((f) => {
      if (f.type === 'month') {
        if (f.hasCurrentToggle && formData._isCurrent) {
          payload[f.name] = null;
        } else {
          payload[f.name] = monthToIso(formData[f.name]) || null;
        }
      } else if (f.type === 'tags') {
        payload[f.name] = formData[f.name]
          ? formData[f.name].split(',').map((t) => t.trim()).filter(Boolean)
          : [];
      } else if (f.type === 'gpa') {
        const val = formData[f.name];
        payload[f.name] = val !== '' ? parseFloat(val) : null;
      } else {
        payload[f.name] = formData[f.name] || null;
      }
    });

    if (isEditing) {
      payload.id = entry.id;
    }

    onSave(payload);
  };

  if (!config) return null;

  const modalTitle = isEditing ? config.title.edit : config.title.add;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {validationError && (
          <Alert variant="error" dismissible onDismiss={() => setValidationError(null)}>
            {validationError}
          </Alert>
        )}

        {config.fields.map((field) => {
          if (field.type === 'month') {
            const isCurrentField = field.hasCurrentToggle;
            const disabled = isCurrentField && formData._isCurrent;

            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <input
                  type="month"
                  value={disabled ? '' : formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={disabled}
                  required={field.required && !disabled}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             text-foreground disabled:opacity-50"
                />
                {isCurrentField && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData._isCurrent}
                      onChange={(e) => handleChange('_isCurrent', e.target.checked)}
                      className="rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">{field.currentLabel}</span>
                  </label>
                )}
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}
                </label>
                <textarea
                  value={formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             text-foreground placeholder-muted-foreground resize-none"
                />
              </div>
            );
          }

          if (field.type === 'city') {
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}
                </label>
                <CitySearchInput
                  name={field.name}
                  value={formData[field.name]}
                  onChange={(value) => handleChange(field.name, value)}
                  placeholder={field.placeholder}
                />
              </div>
            );
          }

          if (field.type === 'gpa') {
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             text-foreground placeholder-muted-foreground"
                />
              </div>
            );
          }

          return (
            <div key={field.name}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={formData[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                           text-foreground placeholder-muted-foreground"
              />
              {field.type === 'tags' && formData[field.name] && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData[field.name].split(',').map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {isEditing && onDelete && (
              <SecondaryButton
                variant="dangerOutline"
                size="sm"
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => onDelete(entry.id)}
              >
                Delete
              </SecondaryButton>
            )}
          </div>
          <div className="flex gap-3">
            <SecondaryButton variant="outline" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <GradientButton type="submit" size="sm">
              {isEditing ? 'Save Changes' : 'Add'}
            </GradientButton>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
