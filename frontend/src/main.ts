// Punto de arranque del navegador. No se cubre con tests unitarios: Karma monta
// su propio entorno (TestBed) y nunca ejecuta este bootstrap. Su lógica es una
// sola llamada declarativa; `app.config.ts` / `app.routes.ts` se ejercitan de
// forma indirecta en los specs que usan TestBed + provideRouter.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
