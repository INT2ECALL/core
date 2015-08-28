/// <reference path="../../../../../typings/es6/lib.es6.d.ts" />
/// <reference path="../../../../../typings/angular2/angular2.d.ts" />


/**
 * Check for the presence and value of a header on the user's request.
 *
 * Express a condition based on two fields: a Header, and a Header Comparison
 * @see https://en.wikipedia.org/wiki/List_of_HTTP_header_fields#Request_fields
 * @see https://tools.ietf.org/html/rfc7231#section-5
 * @see http://www.iana.org/assignments/message-headers/message-headers.xml#perm-headers
 *
 *
 * ## POSIX Utility Argument Syntax (http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
 * ```
 * cw-request-header-conditionlet [-n][-h header_key] [-c comparator] [comparison_values...]
 *   -n                      Negate the match.
 *   -h                      The exact key to search for. Case sensitive.
 *   -e                      Exists. Only verify that the header exists on the Request. The value may be empty or nonsensical.
 *   -c                      The comparator id. One of [ exists, is, startsWith, endsWith, contains, regex]
 *   comparison_values       One or more values compare against the header value.
 * ```
 *
 * ## UI Layout
 *
 * Conceptually the conditionlet is made up of three fields:
 * ```
 * <div>
 *   <input-select-one name="header_key" required="true"/>
 *   <select-one name="comparator" />
 *   <input-select-many name="comparison_values" required="true" />
 * </div>
 * ```
 * ### Fields
 *
 * #### `header_key`
 * The `header_key` is a `select`, pre-populated with common Request header keys. See the Wikipedia.org or iana.org
 * links for more details. There is also an associated text input box that allows custom header keys to be specified.
 *
 * #### `comparator`
 * A standard `select` element containing the allowed comparator ids. One of [ exists, is, startsWith, endsWith, contains, regex].
 * When the selected value is 'exists' the `comparison_values` UI field will be hidden and its model value cleared.
 *
 * #### `comparison_values`
 * Multiple comparison values may be set. Each value shall be specified as per rfc7231#section-5. The UI will
 * **temporarily** add manually keyed inputs into the list of `select` options, negating the need to concern the
 * end user with character escape syntax etc.
 *
 *
 * ------------------------ Discussion ------------------------
 *
 * --------------------------
 */

import {Component, View, Attribute, EventEmitter, NgFor, NgIf} from 'angular2/angular2';

/**
 * @todo: Consider populating these from the server
 * @type {string[]}
 */
let commonRequestHeaders = [
  "Accept",
  "Accept-Charset",
  "Accept-Datetime",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-MD5",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Max-Forwards",
  "Origin",
  "Pragma",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "TE",
  "Upgrade",
  "User-Agent",
  "Via",
  "Warning"
]


export class RequestHeaderConditionletModel {
  headerKeyValue:string;
  comparatorValue:string;
  comparisonValues:Array<string>;

  constructor(headerKeyValue = null, comparatorValue = null, comparisonValues = []) {
    this.headerKeyValue = headerKeyValue
    this.comparatorValue = comparatorValue
    this.comparisonValues = comparisonValues || []
  }

  clone():RequestHeaderConditionletModel {
    return new RequestHeaderConditionletModel(this.headerKeyValue, this.comparatorValue, [].concat(this.comparisonValues))
  }
}

@Component({
  selector: 'cw-request-header-conditionlet',
  properties: [
    "headerKeyValue", "comparatorValue", "comparisonValues"
  ],
  events: [
    "change"
  ]
})
@View({
  directives: [NgFor],
  template: `
    <div class="row">
      <div class="col-sm-4">
        <span class="cw-label">Header: </span>
        <select class="form-control header-key" [value]="value.headerKeyValue" (change)="updateHeaderKey($event)">
          <option [selected]="hkOpt === value.headerKeyValue" value="{{hkOpt}}" *ng-for="var hkOpt of predefinedHeaderKeyOptions">{{hkOpt}}</option>
        </select>
      </div>
      <div class="col-sm-3">
        <span class="cw-label">&nbsp;</span>
        <select class="form-control comparator" [value]="value.comparatorValue" (change)="updateComparator($event)">
          <option [selected]="cOpt === value.comparatorValue" value="{{cOpt}}" *ng-for="var cOpt of comparisonOptions">{{cOpt}}</option>
        </select>
      </div>
      <div class="col-sm-4">
        <span class="cw-label">Values: </span>
        <input type="text" class="form-control condition-value" [value]="value.comparisonValues.join(', ')" placeholder="Enter a value" (change)="updateComparisonValues($event)"/>
      </div>
      <div class="col-sm-1">
        <div class="cw-label">&nbsp;</div>
        <button type="button" class="btn btn-default" aria-label="Info" >
          <span class="glyphicon glyphicon-info-sign"></span>
        </button>
      </div>
    </div>
  `
})
export class RequestHeaderConditionlet {
  // @todo populate the comparisons options from the server.
  comparisonOptions:Array<string> = ["exists", "is", "startsWith", "endsWith", "contains", "regex"];
  predefinedHeaderKeyOptions:Array<string> = commonRequestHeaders;

  value:RequestHeaderConditionletModel;

  change:EventEmitter;

  constructor(@Attribute('header-key-value') headerKeyValue:string,
              @Attribute('comparatorValue') comparatorValue:string,
              @Attribute('comparisonValues') comparisonValues:Array<string>) {
    this.value = new RequestHeaderConditionletModel(headerKeyValue, comparatorValue, comparisonValues)
    this.change = new EventEmitter();
  }

  _modifyEventForForwarding(event:Event, field, oldState:RequestHeaderConditionletModel):Event {
    Object.assign(event, {ngTarget: this, was: oldState, value: this.value, valueField: field })
    return event
  }

  set headerKeyValue(value:string){
    this.value.headerKeyValue = value
  }

  set comparatorValue(value:string){
    this.value.comparatorValue = value
  }

  set comparisonValues(value:Array<string>){
    this.value.comparisonValues = value || []
  }

  updateHeaderKey(event:Event) {
    let value = event.target.value
    let e = this._modifyEventForForwarding(event, 'headerKeyValue', this.value.clone())
    this.value.headerKeyValue = value
    this.change.next(e)
  }

  updateComparator(event:Event) {
    let value = event.target.value
    let e = this._modifyEventForForwarding(event, 'comparatorValue', this.value.clone())
    this.value.comparatorValue = value
    this.change.next(e)
  }

  updateComparisonValues(event:Event) {
    let e = this._modifyEventForForwarding(event, 'comparisonValues', this.value.clone())
    this.value.comparisonValues.push('Todo: Implement input-select element.')
    this.change.next(e)
  }

}
