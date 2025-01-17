import { Subject } from 'rxjs';

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { Menu } from 'primeng/menu';

import { Observable } from 'rxjs/internal/Observable';
import { filter, takeUntil } from 'rxjs/operators';

import { DotMessageSeverity, DotMessageType } from '@components/dot-message-display/model';
import { DotMessageDisplayService } from '@components/dot-message-display/services';
import { DotRouterService } from '@dotcms/app/api/services/dot-router/dot-router.service';
import { DotEventsService } from '@dotcms/data-access';
import { DotCMSContentlet } from '@dotcms/dotcms-models';

import { DotPagesState, DotPageStore } from './dot-pages-store/dot-pages.store';

export const FAVORITE_PAGE_LIMIT = 5;

export interface DotActionsMenuEventParams {
    event: MouseEvent;
    actionMenuDomId: string;
    item: DotCMSContentlet;
}

@Component({
    selector: 'dot-pages',
    templateUrl: './dot-pages.component.html',
    styleUrls: ['./dot-pages.component.scss'],
    providers: [DotPageStore]
})
export class DotPagesComponent implements OnInit, OnDestroy {
    @ViewChild('menu') menu: Menu;
    vm$: Observable<DotPagesState> = this.store.vm$;

    private domIdMenuAttached = '';
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private store: DotPageStore,
        private dotRouterService: DotRouterService,
        private dotMessageDisplayService: DotMessageDisplayService,
        private dotEventsService: DotEventsService,
        private element: ElementRef
    ) {
        this.store.setInitialStateData(FAVORITE_PAGE_LIMIT);
    }

    /**
     * Event to redirect to Edit Page when Page selected
     *
     * @param {string} url
     * @memberof DotPagesComponent
     */
    goToUrl(url: string): void {
        const splittedUrl = url.split('?');
        const urlParams = { url: splittedUrl[0] };
        const searchParams = new URLSearchParams(splittedUrl[1]);

        for (const entry of searchParams) {
            urlParams[entry[0]] = entry[1];
        }

        this.dotRouterService.goToEditPage(urlParams);
    }

    /**
     * Event to show/hide actions menu when each contentlet is clicked
     *
     * @param {DotActionsMenuEventParams} params
     * @memberof DotPagesComponent
     */
    showActionsMenu({ event, actionMenuDomId, item }: DotActionsMenuEventParams): void {
        event.stopPropagation();
        this.menu.hide();

        if (event?.currentTarget['id'] !== this.domIdMenuAttached) {
            this.store.showActionsMenu({ item, actionMenuDomId });
        }
    }

    /**
     * Event to reset status of menu actions when closed
     *
     * @memberof DotPagesComponent
     */
    closedActionsMenu() {
        this.store.clearMenuActions();
        this.domIdMenuAttached = '';
    }

    ngOnInit(): void {
        this.store.actionMenuDomId$
            .pipe(
                takeUntil(this.destroy$),
                filter((actionMenuDomId) => !!actionMenuDomId)
            )
            .subscribe((actionMenuDomId: string) => {
                const target = this.element.nativeElement.querySelector(`#${actionMenuDomId}`);
                if (target) {
                    this.menu.show({ currentTarget: target });
                    this.domIdMenuAttached = actionMenuDomId;
                }
            });

        this.dotEventsService
            .listen('dot-global-message')
            .pipe(takeUntil(this.destroy$))
            .subscribe((evt) => {
                this.store.getPages({ offset: 0 });
                this.dotMessageDisplayService.push({
                    life: 3000,
                    message: evt.data['value'],
                    severity: DotMessageSeverity.SUCCESS,
                    type: DotMessageType.SIMPLE_MESSAGE
                });
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
