/**
 * NameInputPair Component
 *
 * Side-by-side first name and last name inputs with consistent styling.
 * Works with useForm's handleChange or custom handlers.
 */

import FormInput from './FormInput';

export default function NameInputPair({
  firstName,
  lastName,
  onChange,
  disabled = false,
  firstNamePlaceholder = 'First name *',
  lastNamePlaceholder = 'Last name *',
  className = '',
}) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <FormInput
        type="text"
        name="firstName"
        placeholder={firstNamePlaceholder}
        value={firstName}
        onChange={onChange}
        disabled={disabled}
        required
      />
      <FormInput
        type="text"
        name="lastName"
        placeholder={lastNamePlaceholder}
        value={lastName}
        onChange={onChange}
        disabled={disabled}
        required
      />
    </div>
  );
}
