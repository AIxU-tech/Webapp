/**
 * AddUniversityPage Component
 *
 * Page for creating a new university AI club entry.
 * Uses a reusable UniversityForm component that can be shared
 * with the edit university page.
 *
 * Features:
 * - Reusable form component with validation
 * - Traditional form POST to Flask backend (hybrid approach)
 * - Clean, accessible UI matching the original Jinja template
 *
 * Note: This currently uses traditional form submission to Flask.
 * In the future, you can add onSubmit handler to make it SPA-style.
 *
 * @component
 */

import { useEffect } from 'react';
import UniversityForm from '../components/UniversityForm';

export default function AddUniversityPage() {
  /**
   * Set Page Title
   *
   * Updates the browser tab title when component mounts.
   * Equivalent to Jinja's `{% block title %}Add University - AIxU{% endblock %}`
   */
  useEffect(() => {
    document.title = 'Add University - AIxU';
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/*
        Page Header

        Main heading for the page.
        Uses consistent styling with other pages.
      */}
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Add University
      </h1>

      {/*
        Flash Messages Note

        The original Jinja template shows flash messages here.
        Currently, when the form posts to Flask and there's an error,
        Flask will render the existing Jinja page with flashes.

        Future improvement: Add client-side validation and error display
        using React state, or handle form submission via API and show
        errors in this React component.
      */}

      {/*
        University Form Component

        Reusable form component that handles:
        - Form fields: name, location, clubName, tags, description
        - Input validation (required fields)
        - Styling and layout

        Current behavior:
        - Traditional HTML form POST to /universities/new
        - Flask handles validation and database operations
        - On success: Flask redirects to university detail page
        - On error: Flask re-renders with flash messages

        Future enhancement:
        - Add onSubmit prop to handle form submission via API
        - Stay in React SPA and show success/error messages
        - Redirect using React Router instead of Flask redirect
      */}
      <UniversityForm
        /**
         * Initial Values
         *
         * Empty form for creating new university.
         * For edit page, you would pass existing university data here.
         */
        initialValues={{
          name: '',
          location: '',
          clubName: '',
          tags: '',
          description: '',
        }}

        /**
         * Submit Button Label
         *
         * "Create" for new university
         * "Update" for editing existing university
         */
        submitLabel="Create"

        /**
         * Form Action
         *
         * URL to POST the form data to.
         * Points to existing Flask route: POST /universities/new
         *
         * This maintains compatibility with the existing backend
         * while we gradually migrate to full SPA functionality.
         */
        action="/universities/new"

        /**
         * HTTP Method
         *
         * Standard POST for form submission.
         */
        method="POST"

        /**
         * onSubmit Handler (Optional)
         *
         * Not provided here, so form does traditional browser POST.
         *
         * To make this a full SPA experience, you could add:
         *
         * onSubmit={async (formData) => {
         *   try {
         *     const response = await createUniversity({
         *       name: formData.name,
         *       location: formData.location,
         *       club_name: formData.clubName,
         *       tags: formData.tags.split(',').map(t => t.trim()),
         *       description: formData.description,
         *     });
         *     // Show success message
         *     navigate(`/universities/${response.id}`);
         *   } catch (error) {
         *     // Show error message
         *   }
         * }}
         */
      />
    </div>
  );
}
