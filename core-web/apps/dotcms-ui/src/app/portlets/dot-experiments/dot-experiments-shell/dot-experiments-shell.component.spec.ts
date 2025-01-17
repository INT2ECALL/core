import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { ComponentStore } from '@ngrx/component-store';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MessageService } from 'primeng/api';
import { Toast, ToastModule } from 'primeng/toast';

import { DotLoadingIndicatorModule } from '@components/_common/iframe/dot-loading-indicator/dot-loading-indicator.module';
import { DotExperimentsUiHeaderComponent } from '@portlets/dot-experiments/shared/ui/dot-experiments-header/dot-experiments-ui-header.component';

import { DotExperimentsShellComponent } from './dot-experiments-shell.component';

class ActivatedRouteMock {
    get parent() {
        return {
            parent: {
                snapshot: {
                    data: {
                        content: {
                            page: {
                                identifier: '1234',
                                title: 'My dotCMS experiment'
                            }
                        }
                    }
                }
            }
        };
    }
}

class RouterMock {
    navigate() {
        return true;
    }
}

describe('DotExperimentsShellComponent', () => {
    let spectator: Spectator<DotExperimentsShellComponent>;
    let toastComponent: Toast;

    const createComponent = createComponentFactory({
        imports: [
            HttpClientTestingModule,
            DotExperimentsUiHeaderComponent,
            DotLoadingIndicatorModule,
            RouterModule,
            ToastModule
        ],
        component: DotExperimentsShellComponent,
        providers: [
            ComponentStore,
            MessageService,
            {
                provide: ActivatedRoute,
                useClass: ActivatedRouteMock
            },
            {
                provide: Router,
                useClass: RouterMock
            }
        ]
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should has Toast component', () => {
        toastComponent = spectator.query(Toast);

        expect(toastComponent).toExist();
    });
});
