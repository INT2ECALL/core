import { ElementRef, Component, View, Directive, ViewContainerRef, TemplateRef, EventEmitter, Attribute} from 'angular2/core';
import { Host, AfterViewInit, AfterViewChecked, OnDestroy, Output, Input, ChangeDetectionStrategy } from 'angular2/core';
import { CORE_DIRECTIVES,  } from 'angular2/common';
import {BehaviorSubject, Observable} from 'rxjs/Rx'


/**
 * Angular 2 wrapper around Semantic UI Dropdown Module.
 * @see http://semantic-ui.com/modules/dropdown.html#/usage
 * Comments for event handlers, etc, copied directly from semantic-ui documentation.
 *
 * @todo ggranum: Extract semantic UI components into a separate github repo and include them via npm.
 */

var $ = window['$']

const DO_NOT_SEARCH_ON_THESE_KEY_EVENTS = {

  13: 'enter',
  33: 'pageUp',
  34: 'pageDown',
  37: 'leftArrow',
  38: 'upArrow',
  39: 'rightArrow',
  40: 'downArrow',
}


@Component({
  selector: 'cw-input-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ui fluid selection dropdown search ng-valid"
     [ngClass]="{required:minSelections > 0, multiple: maxSelections > 1}"
     tabindex="0"
     (change)="$event.stopPropagation()"
     (blur)="$event.stopPropagation()">
  <input type="hidden" [name]="name" [value]="value" />
  <i class="dropdown icon"></i>
  <div class="default text">{{placeholder}}</div>
  <div class="menu" tabindex="-1">
    <div *ngFor="var opt of _options | async" class="item" [attr.data-value]="opt.value" [attr.data-text]="opt.label">
      <i [ngClass]="opt.icon" ></i>
      {{opt.label}}
    </div>
  </div>
</div>
  `,
  directives: [CORE_DIRECTIVES]
})
export class Dropdown implements AfterViewInit, OnDestroy {

  @Input() value:string
  @Input() name:string
  @Input() placeholder:string
  @Input() allowAdditions:boolean
  @Input() minSelections:number
  @Input() maxSelections:number

  @Output() change:EventEmitter<any>

  private _optionsAry:InputOption[] = []
  private _options:BehaviorSubject<InputOption[]>
  private elementRef:ElementRef
  private _$dropdown:any

  constructor(elementRef:ElementRef) {
    this.placeholder = ""
    this.allowAdditions = false
    this.minSelections = 0
    this.maxSelections = 1
    this.change = new EventEmitter()
    this._options = new BehaviorSubject(this._optionsAry);
    this.elementRef = elementRef
  }

  ngOnChanges(change) {
    if (change.value ) {
      this.applyValue(this.value)
    }
  }

  private applyValue(value) {
    var count = 0;
    Observable.interval(10).takeWhile(()=> {
      count++
      if (count > 100) {
        throw "Dropdown element not found."
      }
      return this._$dropdown == null
    }).subscribe(()=> {
      // still null!
    }, (e)=> {
      console.log("Dropdown", "Error", e)
    }, ()=> {
      console.log("Dropdown", "onComplete")
      this._$dropdown.dropdown('set selected', value)
    })
  }


  addOption(option:InputOption) {
    this._optionsAry = this._optionsAry.concat(option)
    this._options.next(this._optionsAry)
    if(option.value === this.value){
      this.refreshDisplayText(option.label)
    }
  }

  updateOption(option:InputOption){
    this._optionsAry = this._optionsAry.filter((opt)=>{
      return opt !== option
    })
    this.addOption(option)
  }

  ngAfterViewInit() {
    this.initDropdown()
  }

  ngOnDestroy(){
    // remove the change emitter so that we don't fire changes when we clear the dropdown.
    this.change = null;
    this._$dropdown.dropdown('clear')
  }

  refreshDisplayText(label:string) {
    if (this._$dropdown) {
      this._$dropdown.dropdown('set text', label)
    }
  }

  initDropdown() {
    var self = this;
    var badSearch = null
    let config:any = {
      allowAdditions: this.allowAdditions,
      allowTab: true,
      placeholder: 'auto',

      onChange: (value, text, $choice)=> {
        badSearch = null
        return this.onChange(value, text, $choice)
      },
      onAdd: (addedValue, addedText, $addedChoice)=> {
        return this.onAdd(addedValue, addedText, $addedChoice)
      },
      onRemove: (removedValue, removedText, $removedChoice)=> {
        return this.onRemove(removedValue, removedText, $removedChoice)
      },
      onLabelCreate: function (value, text) {
        let $label = this;
        return self.onLabelCreate($label, value, text)
      },
      onLabelSelect: ($selectedLabels)=> {
        return this.onLabelSelect($selectedLabels)
      },
      onNoResults: (searchValue)=> {
        badSearch = searchValue
        return this.onNoResults(searchValue)
      },
      onShow: ()=> {
        return this.onShow()
      },
      onHide: ()=> {
        if(badSearch !== null){
          badSearch = null
          this._$dropdown.children('input.search')[0].value = ''
          if(!this.value || (this.value && this.value.length === 0)){
            this._$dropdown.dropdown('set text', this.placeholder)
          } else {
            this._$dropdown.dropdown('set selected', this.value)
          }
        }
        return this.onHide()
      }
    }
    if (this.maxSelections > 1) {
      config.maxSelections = this.maxSelections
    }

    var el = this.elementRef.nativeElement
    this._$dropdown = $(el).children('.ui.dropdown');
    this._$dropdown.dropdown(config)
    this._applyArrowNavFix(this._$dropdown);
  }

  private isMultiSelect():boolean {
    return this.maxSelections > 1
  }

  /**
   * Fixes an issue with up and down arrows triggering a search in the dropdown, which auto selects the first result
   * after a short buffering period.
   * @param $dropdown The JQuery dropdown element, after calling #.dropdown(config).
   * @private
   */
  private _applyArrowNavFix($dropdown) {
    let $searchField = $dropdown.children('input.search')
    $searchField.on('keyup', (event:any)=> {
      if (DO_NOT_SEARCH_ON_THESE_KEY_EVENTS[event.keyCode]) {
        event.stopPropagation()
      }
    })
  };


  /**
   * Is called after a dropdown value changes. Receives the name and value of selection and the active menu element
   * @param value
   * @param text
   * @param $choice
   */
  onChange(value, text, $choice) {
    this.value = value
    if (this.change) {
        this.change.emit(this.value)
    }
  }

  /**
   * Is called after a dropdown selection is added using a multiple select dropdown, only receives the added value
   * @param addedValue
   * @param addedText
   * @param $addedChoice
   */
  onAdd(addedValue, addedText, $addedChoice) {
  }

  /**
   * Is called after a dropdown selection is removed using a multiple select dropdown, only receives the removed value
   * @param removedValue
   * @param removedText
   * @param $removedChoice
   */
  onRemove(removedValue, removedText, $removedChoice) {
  }

  /**
   * Allows you to modify a label before it is added. Expects $label to be returned.
   * @param $label
   * @param value
   * @param text
   */
  onLabelCreate($label, value, text) {
    return $label
  }

  /**
   * Is called after a label is selected by a user
   * @param $selectedLabels
   */
  onLabelSelect($selectedLabels) {
  }

  /**
   * Is called after a dropdown is searched with no matching values
   * @param searchValue
   */
  onNoResults(searchValue) {

  }

  /**
   * Is called before a dropdown is shown. If false is returned, dropdown will not be shown.
   */
  onShow() {
  }

  /**
   * Is called before a dropdown is hidden. If false is returned, dropdown will not be hidden.
   */
  onHide() {
  }
}


@Directive({
  selector: 'cw-input-option'
})
export class InputOption {
  @Input() value:string;
  @Input() label:string;
  @Input() icon:string;
  private _dropdown:Dropdown
  private _isRegistered:boolean


  constructor(@Host() dropdown:Dropdown) {
    this._dropdown = dropdown
  }

  ngOnChanges(change) {
    if (!this._isRegistered) {
      this._dropdown.addOption(this);
      this._isRegistered = true;
    } else {
      if(!this.label){
        this.label = this.value
      }
      this._dropdown.updateOption(this)
    }
  }
}


