import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { LoaderService } from '../../services/loaderservice/loader.service';
import { inject } from '@angular/core';
import { INCLUDED_APIS_FOR_SPINNER } from '../included_apis';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authservice/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const loaderService = inject(LoaderService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastr = inject(ToastrService)

  const includedEndpoints = INCLUDED_APIS_FOR_SPINNER

  const isIncludedEndpoint = (url: string): boolean => {
    return includedEndpoints.some((endpoint: string) => url.includes(endpoint));
  };

  if (isIncludedEndpoint(req.url)) {
    loaderService.show();
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.removeUserInfo();
        setTimeout(() => {
          router.navigateByUrl('login');
        }, 0);
      }
      else if (error.status === 403 && error.error.message.toLowerCase().includes('blocked')) {
        router.navigateByUrl('blocked');
      }    
      return throwError(() => error);
    }),
    finalize(() => {
      if (isIncludedEndpoint(req.url)) {
        loaderService.hide();
      }
    })
  );
};
