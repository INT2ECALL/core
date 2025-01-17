import { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SidebarModule } from 'primeng/sidebar';

import { take } from 'rxjs/operators';

import { DotFieldValidationMessageModule } from '@components/_common/dot-field-validation-message/dot-file-validation-message.module';
import {
    ComponentStatus,
    StepStatus,
    TrafficProportion,
    TrafficProportionTypes,
    Variant
} from '@dotcms/dotcms-models';
import { DotMessagePipeModule } from '@pipes/dot-message/dot-message-pipe.module';
import { DotExperimentsConfigurationStore } from '@portlets/dot-experiments/dot-experiments-configuration/store/dot-experiments-configuration-store';
import { DotSidebarDirective } from '@portlets/shared/directives/dot-sidebar.directive';
import { DotSidebarHeaderComponent } from '@shared/dot-sidebar-header/dot-sidebar-header.component';

@Component({
    selector: 'dot-experiments-configuration-traffic-split-add',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,

        DotFieldValidationMessageModule,
        DotMessagePipeModule,
        DotSidebarHeaderComponent,
        DotSidebarDirective,
        //PrimeNg
        SidebarModule,
        ButtonModule,
        RadioButtonModule,
        InputNumberModule,
        FormsModule
    ],
    templateUrl: './dot-experiments-configuration-traffic-split-add.component.html',
    styleUrls: ['./dot-experiments-configuration-traffic-split-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DotExperimentsConfigurationTrafficSplitAddComponent implements OnInit {
    form: FormGroup;
    stepStatus = ComponentStatus;
    splitEvenly = TrafficProportionTypes.SPLIT_EVENLY;
    customPercentages = TrafficProportionTypes.CUSTOM_PERCENTAGES;

    vm$: Observable<{
        experimentId: string;
        trafficProportion: TrafficProportion;
        trafficAllocation: number;
        status: StepStatus;
    }> = this.dotExperimentsConfigurationStore.trafficStepVm$;

    constructor(
        private readonly dotExperimentsConfigurationStore: DotExperimentsConfigurationStore,
        private fb: FormBuilder
    ) {}

    ngOnInit(): void {
        this.initForm();
    }

    /**
     * Save modification in traffic allocation.
     * @param {string} experimentId
     * @returns void
     * @memberof DotExperimentsConfigurationTrafficSplitAddComponent
     */
    save(experimentId: string) {
        this.dotExperimentsConfigurationStore.setSelectedTrafficProportion({
            trafficProportion: this.form.value,
            experimentId
        });
    }

    /**
     * Close sidebar
     * @returns void
     * @memberof DotExperimentsConfigurationTrafficSplitAddComponent
     */
    closeSidebar() {
        this.dotExperimentsConfigurationStore.closeSidebar();
    }

    /**
     * Split variant propotion
     * @returns void
     * @memberof DotExperimentsConfigurationTrafficSplitAddComponent
     */
    splitVariantsEvenly() {
        const amountOfVariants = this.variants.length;
        this.variants.controls.forEach((variant) => {
            variant.get('weight').setValue(Math.trunc((100 / amountOfVariants) * 100) / 100);
        });
    }

    get variants(): FormArray {
        return this.form.get('variants') as FormArray;
    }

    private initForm() {
        this.vm$.pipe(take(1)).subscribe((data) => {
            this.form = this.fb.group({
                type: new FormControl<TrafficProportionTypes>(data.trafficProportion.type, {
                    nonNullable: true,
                    validators: [Validators.required]
                }),
                variants: this.fb.array<Variant>([])
            });

            data.trafficProportion.variants.forEach((variant) => {
                this.variants.push(this.addVariantToForm(variant));
            });
        });
    }

    private addVariantToForm(variant: Variant): FormGroup {
        return this.fb.group({
            id: variant.id,
            name: variant.name,
            weight: [Math.trunc(variant.weight * 100) / 100, [Validators.required]],
            url: variant.url
        });
    }
}
