import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const customInterceptor: HttpInterceptorFn = (req, next) => {
  const viewToken = sessionStorage.getItem('viewToken');
  const authToken = localStorage.getItem('authToken');
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
