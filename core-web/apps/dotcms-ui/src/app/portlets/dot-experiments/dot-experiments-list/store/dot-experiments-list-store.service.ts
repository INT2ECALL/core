import { ComponentStore, OnStoreInit, tapResponse } from '@ngrx/component-store';
import { EMPTY, Observable, throwError } from 'rxjs';

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MessageService } from 'primeng/api';

import { catchError, switchMap, tap } from 'rxjs/operators';

import { DotMessageService } from '@dotcms/data-access';
import {
    ComponentStatus,
    DotExperiment,
    DotExperimentStatusList,
    GroupedExperimentByStatus
} from '@dotcms/dotcms-models';
import { DotExperimentsService } from '@portlets/dot-experiments/shared/services/dot-experiments.service';

export interface DotExperimentsState {
    page: {
        pageId: string;
        pageTitle: string;
    };
    experiments: DotExperiment[];
    filterStatus: Array<string>;
    status: ComponentStatus;
}

const initialState: DotExperimentsState = {
    page: {
        pageId: '',
        pageTitle: ''
    },
    experiments: [],
    filterStatus: [
        DotExperimentStatusList.DRAFT,
        DotExperimentStatusList.ENDED,
        DotExperimentStatusList.RUNNING,
        DotExperimentStatusList.SCHEDULED,
        DotExperimentStatusList.ARCHIVED
    ],
    status: ComponentStatus.INIT
};

// Vm Interfaces
export interface VmListExperiments {
    page: {
        pageId: string;
        pageTitle: string;
    };
    isLoading: boolean;
    experiments: DotExperiment[];
    experimentsFiltered: { [key: string]: DotExperiment[] };
    filterStatus: Array<string>;
}

@Injectable({
    providedIn: 'root'
})
export class DotExperimentsListStore
    extends ComponentStore<DotExperimentsState>
    implements OnStoreInit
{
    // Selectors
    readonly getPage$ = this.select((state) => state.page);
    readonly getStatus$ = this.select((state) => state.status);

    readonly getExperiments$ = this.select((state) => state.experiments);

    readonly getFilterStatusList$ = this.select((state) => state.filterStatus);

    readonly getExperimentsFilteredAndGroupedByStatus$ = this.select(
        ({ experiments, filterStatus }) =>
            experiments
                .filter((experiment) => filterStatus.includes(experiment.status))
                .reduce<GroupedExperimentByStatus>((group, experiment) => {
                    group[experiment.status] = group[experiment.status] ?? [];
                    group[experiment.status].push(experiment);

                    return group;
                }, <GroupedExperimentByStatus>{})
    );

    readonly isLoading$: Observable<boolean> = this.select(
        (state) => state.status === ComponentStatus.LOADING || state.status === ComponentStatus.INIT
    );

    //Updater
    readonly initStore = this.updater((state) => ({
        ...state,
        status: ComponentStatus.INIT
    }));

    readonly setPageId = this.updater((state, pageId: string) => ({
        ...state,
        pageId
    }));

    readonly setComponentStatus = this.updater((state, status: ComponentStatus) => ({
        ...state,
        status
    }));

    readonly setExperiments = this.updater((state, experiments: DotExperiment[]) => ({
        ...state,
        status: ComponentStatus.LOADED,
        experiments
    }));

    readonly addExperiment = this.updater((state, experiments: DotExperiment[]) => ({
        ...state,
        status: ComponentStatus.LOADED,
        experiments: [...state.experiments, ...experiments]
    }));

    readonly setFilterStatus = this.updater((state, filterStatus: Array<string>) => ({
        ...state,
        filterStatus
    }));

    readonly deleteExperimentById = this.updater((state, experimentId: string) => ({
        ...state,
        experiments: state.experiments.filter((exp) => exp.id != experimentId)
    }));

    readonly archiveExperimentById = this.updater((state, experimentId: string) => ({
        ...state,
        experiments: state.experiments.map((exp) =>
            experimentId === exp.id ? { ...exp, status: DotExperimentStatusList.ARCHIVED } : exp
        )
    }));

    readonly loadExperiments = this.effect((pageId$: Observable<string>) => {
        return pageId$.pipe(
            tap(() => this.setComponentStatus(ComponentStatus.LOADING)),
            switchMap((pageId) =>
                this.dotExperimentsService.getAll(pageId).pipe(
                    tapResponse(
                        (experiments) => this.setExperiments(experiments),
                        (error: HttpErrorResponse) => throwError(error),
                        () => this.setComponentStatus(ComponentStatus.LOADED)
                    )
                )
            )
        );
    });

    readonly deleteExperiment = this.effect((experiment$: Observable<DotExperiment>) => {
        return experiment$.pipe(
            tap(() => this.setComponentStatus(ComponentStatus.LOADING)),
            switchMap((experiment) =>
                this.dotExperimentsService.delete(experiment.id).pipe(
                    tapResponse(
                        () => {
                            this.messageService.add({
                                severity: 'info',
                                summary: this.dotMessageService.get(
                                    'experiments.action.delete.confirm-title'
                                ),
                                detail: this.dotMessageService.get(
                                    'experiments.action.delete.confirm-message',
                                    experiment.name
                                )
                            });
                            this.deleteExperimentById(experiment.id);
                        },
                        (error) => throwError(error),
                        () => this.setComponentStatus(ComponentStatus.LOADED)
                    ),
                    catchError(() => EMPTY)
                )
            )
        );
    });

    readonly archiveExperiment = this.effect((experiment$: Observable<DotExperiment>) => {
        return experiment$.pipe(
            tap(() => this.setComponentStatus(ComponentStatus.LOADING)),
            switchMap((experiment) =>
                this.dotExperimentsService.archive(experiment.id).pipe(
                    tapResponse(
                        () => {
                            this.messageService.add({
                                severity: 'info',
                                summary: this.dotMessageService.get(
                                    'experiments.action.archived.confirm-title'
                                ),
                                detail: this.dotMessageService.get(
                                    'experiments.action.archived.confirm-message',
                                    experiment.name
                                )
                            });
                            this.archiveExperimentById(experiment.id);
                        },
                        (error) => throwError(error),
                        () => this.setComponentStatus(ComponentStatus.LOADED)
                    ),
                    catchError(() => EMPTY)
                )
            )
        );
    });

    readonly vm$: Observable<VmListExperiments> = this.select(
        this.getPage$,
        this.isLoading$,
        this.getExperiments$,
        this.getExperimentsFilteredAndGroupedByStatus$,
        this.getFilterStatusList$,
        (page, isLoading, experiments, experimentsFiltered, filterStatus) => ({
            page,
            isLoading,
            experiments,
            experimentsFiltered,
            filterStatus
        })
    );

    constructor(
        private readonly dotExperimentsService: DotExperimentsService,
        private readonly dotMessageService: DotMessageService,
        private readonly messageService: MessageService,
        private readonly route: ActivatedRoute
    ) {
        super({
            ...initialState,
            page: {
                pageId: route.snapshot.params.pageId,
                pageTitle: route.snapshot.parent?.parent?.parent?.parent.data?.content?.page?.title
            }
        });
    }

    ngrxOnStoreInit() {
        const pageId = this.route.snapshot.params.pageId;
        this.loadExperiments(pageId);
    }
}
