import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { AuthApiService } from '@/app/auth/services/api/auth.service';
import { AppFloatingConfigurator } from '@/app/layout/component/app.floatingconfigurator';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        PasswordModule,
        FormsModule,
        RouterModule,
        RippleModule,
        AppFloatingConfigurator,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class Login {
    email: string = '';
    password: string = '';
    checked: boolean = false;
    isLoading: boolean = false;

    constructor(
        private authApi: AuthApiService,
        private messageService: MessageService,
        private router: Router
    ) {}

    handleLogin() {
        if (!this.email || !this.password) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Email and password are required.',
                life: 3000
            });
            return;
        }

        this.isLoading = true;
        this.authApi.login({ email: this.email, password: this.password }).subscribe({
            next: (response: any) => {
                this.isLoading = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Login successful!',
                    life: 2000
                });
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    this.router.navigate(['/dashboard']);
                }, 500);
            },
            error: (err: any) => {
                this.isLoading = false;
                const errorMsg = err.error?.errors?.[0] || 'Login failed. Please try again.';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Login Failed',
                    detail: errorMsg,
                    life: 3000
                });
            }
        });
    }
}