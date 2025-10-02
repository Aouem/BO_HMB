import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { routes } from './app/app.routes'; // 🔹 importer correctement

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      HttpClientModule,
      ReactiveFormsModule,
      RouterModule.forRoot(routes) // 🔹 nécessaire pour ActivatedRoute
    )
  ]
}).catch(err => console.error(err));
