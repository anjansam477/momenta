import { FormGroup } from '@angular/forms';

export function markAllFieldsAsTouched(form: FormGroup): void {
  Object.keys(form.controls).forEach(field => {
    form.get(field)?.markAsTouched({ onlySelf: true });
  });
}
