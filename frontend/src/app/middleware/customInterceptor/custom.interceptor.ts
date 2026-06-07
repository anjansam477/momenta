import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authservice/auth.service';

export const customInterceptor: HttpInterceptorFn = (req, next) => {
  const viewToken = sessionStorage.getItem('viewToken');
  const authToken = inject(AuthService).getToken();
  const router = inject(Router);

  if (router.url.includes('/moment/')) {
    const selectedToken = authToken || viewToken;

    if (selectedToken) {
      const authHeader = authToken ? `Bearer ${authToken}` : `View ${viewToken}`;

      const tempReq = req.clone({
        setHeaders: {
          Authorization: authHeader
        }
      });
      return next(tempReq);
    }
  } else {
    if (authToken) {
      const tempReq = req.clone({
        setHeaders: {
          authorization: `Bearer ${authToken}`
        }
      });
      return next(tempReq);
    }
  }
  return next(req);
};
