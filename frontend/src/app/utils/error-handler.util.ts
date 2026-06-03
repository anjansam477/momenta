import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

export function handleHttpError(err: HttpErrorResponse, toastr: ToastrService): void {
  if (err.status !== 401) {
    toastr.error(err.error?.message ?? 'Something went wrong. Please try again.');
  }
}
