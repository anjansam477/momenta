import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function noWhitespaceValidator(fieldName :string,minLength: number | null, maxLength: number | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const trimmedValue = (control.value || '').trim();
    
    if (trimmedValue.length === 0) {
      return { error: `${fieldName} cannot be empty or only whitespace` };
    }
    
    if (minLength && trimmedValue.length < minLength) {
      return { error: `${fieldName}  must be at least ${minLength} characters long` };
    }

    if (maxLength && trimmedValue.length > maxLength) {
      return { error: `${fieldName} cannot be longer than ${maxLength} characters` };
    }
    return null;
  };
}

