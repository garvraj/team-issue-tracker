import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth';
import { mockBackendInterceptor } from './core/mock-backend/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // The mock backend must run last so it sees headers added by earlier interceptors.
    provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
  ],
};
