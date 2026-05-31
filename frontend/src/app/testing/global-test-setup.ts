import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';

const activatedRouteStub = {
  params: of({}),
  queryParams: of({}),
  url: of([]),
  snapshot: {
    params: {},
    queryParams: {},
    paramMap: { get: () => null },
    queryParamMap: { get: () => null },
  },
};

export const MOMENTA_TEST_PROVIDERS: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
  provideNoopAnimations(),
  provideRouter([]),
  provideToastr(),
  { provide: ActivatedRoute, useValue: activatedRouteStub },
];
