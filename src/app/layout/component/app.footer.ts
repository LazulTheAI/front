import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        For more information
        <a href="https://todo.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">documentation</a>
    </div>`
})
export class AppFooter {}
