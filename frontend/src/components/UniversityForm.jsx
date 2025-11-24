// frontend/src/components/universities/UniversityForm.jsx
import React, { useState } from 'react';

/**
 * Reusable form component for creating / editing a university.
 *
 * Props:
 * - initialValues: {
 *     name: string,
 *     location: string,
 *     clubName: string,
 *     tags: string,        // comma-separated
 *     description: string,
 *   }
 * - submitLabel: string      // e.g. "Create" or "Update"
 * - action: string           // form action URL (for traditional POST)
 * - method: string           // usually "POST"
 * - onSubmit?: (data) => void
 *      If provided, we prevent default and call onSubmit(data).
 *      If not provided, the browser does a normal HTML form POST to `action`.
 */
function UniversityForm({
  initialValues = {
    name: '',
    location: '',
    clubName: '',
    tags: '',
    description: '',
  },
  submitLabel = 'Create',
  action,
  method = 'POST',
  onSubmit,
}) {
  const [formData, setFormData] = useState(initialValues);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    if (onSubmit) {
      event.preventDefault();
      onSubmit(formData);
    }
    // If no onSubmit is provided, allow the browser to do the normal POST
    // to the Flask route and leave the SPA (behavior identical to Jinja).
  };

  return (
    <form
      method={method}
      action={onSubmit ? undefined : action}
      onSubmit={handleSubmit}
      className="space-y-4 bg-card border border-border rounded-lg p-6 shadow-card"
    >
      <div>
        <label className="block text-sm text-muted-foreground mb-1">
          Name of University
        </label>
        <input
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">
          Location
        </label>
        <input
          name="location"
          type="text"
          required
          value={formData.location}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">
          Club Name
        </label>
        <input
          name="clubName"
          type="text"
          required
          value={formData.clubName}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">
          Tags (comma-separated)
        </label>
        <input
          name="tags"
          type="text"
          value={formData.tags}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={6}
          required
          value={formData.description}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-gradient-primary text-white px-6 py-2 rounded-md hover:shadow-hover transition-all"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default UniversityForm;