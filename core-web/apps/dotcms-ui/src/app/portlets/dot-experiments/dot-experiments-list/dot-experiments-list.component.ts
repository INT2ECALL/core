import { provideComponentStore } from '@ngrx/component-store';
import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { take } from 'rxjs/operators';

import { DotMessagePipe } from '@dotcms/app/view/pipes';
import { DotExperiment, ExperimentsStatusList } from '@dotcms/dotcms-models';
import { DotExperimentsCreateComponent } from '@portlets/dot-experiments/dot-experiments-create/dot-experiments-create.component';
import {
    DotExperimentsListStore,
    VmListExperiments
} from '@portlets/dot-experiments/dot-experiments-list/store/dot-experiments-list-store.service';
import { DotDynamicDirective } from '@portlets/shared/directives/dot-dynamic.directive';

@Component({
    selector: 'dot-experiments-list',
    templateUrl: './dot-experiments-list.component.html',
    styleUrls: ['./dot-experiments-list.component.scss'],
    providers: [DotMessagePipe, provideComponentStore(DotExperimentsListStore)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DotExperimentsListComponent {
    @ViewChild(DotDynamicDirective, { static: true }) dotDynamicHost!: DotDynamicDirective;

    vm$: Observable<VmListExperiments> = this.dotExperimentsListStore.vm$;

    statusOptionList = ExperimentsStatusList.map(({ label, value }) => {
        return { value, label: this.dotMessagePipe.transform(label) };
    });

    constructor(
        private readonly dotExperimentsListStore: DotExperimentsListStore,
        private readonly dotMessagePipe: DotMessagePipe,
        private readonly router: Router
    ) {}

    /**
     * Update the list of selected statuses
     * @param {Array<string>} $event
     * @returns void
     * @memberof DotExperimentsListComponent
     */
    selectedStatusFilter($event: Array<string>) {
        this.dotExperimentsListStore.setFilterStatus($event);
    }

    /**
     * Add new experiment
     * @param experiment
     * @returns void
     * @memberof DotExperimentsListComponent
     */
    addNewExperiment() {
        const viewContainerRef = this.dotDynamicHost.viewContainerRef;
        viewContainerRef.clear();
        const componentRef = viewContainerRef.createComponent<DotExperimentsCreateComponent>(
            DotExperimentsCreateComponent
        );
        componentRef.instance.closedSidebar.pipe(take(1)).subscribe(() => {
            viewContainerRef.clear();
        });
    }

    /**
     * Archive experiment
     * @param {DotExperiment} experiment
     * @returns void
     * @memberof DotExperimentsListComponent
     */
    archiveExperiment(experiment: DotExperiment) {
        this.dotExperimentsListStore.archiveExperiment(experiment);
    }

    /**
     * Delete experiment
     * @param {DotExperiment} experiment
     * @returns void
     * @memberof DotExperimentsListComponent
     */
    deleteExperiment(experiment: DotExperiment) {
        this.dotExperimentsListStore.deleteExperiment(experiment);
    }

    /**
     * Back to Edit Page / Content
     * @returns void
     * @memberof DotExperimentsShellComponent
     */
    goToBrowserBack() {
        this.router.navigate(['edit-page/content'], {
            queryParams: {
                editPageTab: null,
                variantName: null,
                experimentId: null
            },
            queryParamsHandling: 'merge'
        });
    }
}
