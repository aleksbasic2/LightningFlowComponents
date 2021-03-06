import {LightningElement, track, api} from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {FlowAttributeChangeEvent} from 'lightning/flowSupport';
import apexSearch from '@salesforce/apex/ObjectLookupController.search';

export default class LookupContainer extends LightningElement {
    // Use alerts instead of toast to notify user
    @api objectName;
    @api displayWhichField;
    @api fieldLabel;
    @api outputWhichValue;

    cachedSearchResults = [];
    @api notifyViaAlerts = false;
    @track isMultiEntry = false;
    @track initialSelection = [];
    @track errors = [];


    @api get selectedValue() {
        if (this.initialSelection && this.initialSelection.length) {
            return this.isMultiEntry ? this.initialSelection.map(curValue => curValue.id) : this.initialSelection[0].id;
        } else {
            return this.isMultiEntry ? [] : null;
        }
    }

    set selectedValue(value) {
        if (value) {
            if (!this.cachedSearchResults || !this.cachedSearchResults.length) {
                this.handleSearch({detail: {objectIdList: [value]}}, true);
            } else {
                this.setCachedResult(this.isMultiEntry ? value : [value]);
            }

        } else {
            this.initialSelection = [];
        }
    }

    setCachedResult(value) {
        let val = this.cachedSearchResults.filter(curResult => value.includes(curResult.id));
        if (val) {
            this.initialSelection = val;
        } else {
            this.initialSelection = [];
        }
    }

    handleLookupTypeChange(event) {
        this.initialSelection = [];
        this.errors = [];
        this.isMultiEntry = event.target.checked;
    }

    handleSearch(event, setCachedValue) {
        apexSearch({
            objectName: this.objectName,
            displayWhichField: this.displayWhichField,
            outputWhichValue: this.outputWhichValue,
            searchTerm: event.detail ? event.detail.searchTerm : null,
            objectIdList: event.detail ? event.detail.objectIdList : []
        })
            .then(results => {
                this.cachedSearchResults = results;
                if (setCachedValue && event.detail && event.detail.objectIdList && event.detail.objectIdList.length) {
                    this.setCachedResult(event.detail.objectIdList);
                }
                this.template.querySelector('c-lookup').setSearchResults(results);
            })
            .catch(error => {
                this.notifyUser(
                    'Lookup Error',
                    'An error occured while searching with the lookup field.',
                    'error'
                );
                // eslint-disable-next-line no-console
                console.error('Lookup error', JSON.stringify(error));
                this.errors = [error];
            });
    }

    handleSelectionChange(event) {
        this.selectedValue = event.detail ? event.detail.value : [];
        this.dispatchEvent(new CustomEvent('selectionchange', {
            detail: {
                value: this.selectedValue
            }
        }));
        const valueChangeEvent = new FlowAttributeChangeEvent('selectedValue', this.selectedValue);
        this.dispatchEvent(valueChangeEvent);
        this.errors = [];
    }

    checkForErrors() {
        const selection = this.template
            .querySelector('c-lookup')
            .getSelection();
        if (selection.length === 0) {
            this.errors = [
                {message: 'You must make a selection before submitting!'},
                {message: 'Please make a selection and try again.'}
            ];
        } else {
            this.errors = [];
        }
    }

    notifyUser(title, message, variant) {
        if (this.notifyViaAlerts) {
            // Notify via alert
            // eslint-disable-next-line no-alert
            alert(`${title}\n${message}`);
        } else {
            // Notify via toast
            const toastEvent = new ShowToastEvent({title, message, variant});
            this.dispatchEvent(toastEvent);
        }
    }
}