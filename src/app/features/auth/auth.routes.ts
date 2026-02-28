import { Routes } from '@angular/router';
import { Login } from '../login/login';

export default [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login }
] as Routes;
