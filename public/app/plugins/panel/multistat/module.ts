import _ from 'lodash';
import kbn from '../../../core/utils/kbn';
import React from 'react';
import ReactDOM from 'react-dom';
import defaults from './defaults';
import { MetricsPanelCtrl } from '../../sdk';
import { convertTSDataToMultistat, convertTableDataToMultistat } from './data_handler';
import { MultiStat } from './components/MultiStat';
import * as Series from 'app/types/series';

class MultiStatCtrl extends MetricsPanelCtrl {
  static templateUrl = 'module.html';

  dataType = 'timeseries';
  series: any[];
  data: Series.SeriesStat[];
  tableColumnOptions: any;
  fontSizes: any[];
  unitFormats: any[];
  valueNameOptions: any[] = defaults.valueNameOptions;
  layoutOptions: any[] = defaults.layoutOptions;
  viewModeOptions: any[] = defaults.viewModeOptions;

  /** @ngInject */
  constructor($scope, $injector, templateSrv) {
    super($scope, $injector);
    this.templateSrv = templateSrv;

    _.defaults(this.panel, defaults.panelDefaults);

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
  }

  onInitEditMode() {
    this.fontSizes = ['20%', '30%', '50%', '70%', '80%', '100%', '110%', '120%', '150%', '170%', '200%'];
    this.addEditorTab('Options', 'public/app/plugins/panel/multistat/options.html', 2);
    this.addEditorTab('Thresholds', 'public/app/plugins/panel/multistat/thresholds.html', 3);
    this.unitFormats = kbn.getUnitFormats();
  }

  onDataReceived(dataList) {
    if (dataList.length > 0 && dataList[0].type === 'table') {
      this.dataType = 'table';
      if (dataList[0].rows && !dataList[0].rows.length) {
        return this.onDataError('No data');
      }
      this.setTableColumnToSensibleDefault(dataList[0]);
      this.data = convertTableDataToMultistat(dataList, this.panel);
    } else {
      this.dataType = 'timeseries';
      this.data = convertTSDataToMultistat(dataList, this.panel);
      // this.setValues();
    }
    this.render();
  }

  onDataError(err) {
    this.onDataReceived([]);
  }

  setTableColumnToSensibleDefault(tableData) {
    const columnNames = {};

    tableData.columns.forEach((column, columnIndex) => {
      columnNames[columnIndex] = column.text;
    });

    this.tableColumnOptions = columnNames;
    if (
      _.find(tableData.columns, ['text', this.panel.tableColumnValue]) &&
      _.find(tableData.columns, ['text', this.panel.tableColumnLabel])
    ) {
      return;
    }

    if (tableData.columns.length === 1) {
      this.panel.tableColumnValue = tableData.columns[0].text;
    } else {
      const notTimeColumns = _.filter(tableData.columns, col => col.type !== 'time');
      this.panel.tableColumnValue = _.last(notTimeColumns).text;
      this.panel.tableColumnLabel = _.first(notTimeColumns).text;
    }
  }

  setValuePrefixAndPostfix(data) {
    data.forEach(seriesStat => {
      if (!seriesStat._valueFormatted) {
        // Backup original value
        seriesStat._valueFormatted = seriesStat.valueFormatted;
      }
      let value = this.panel.prefix ? this.templateSrv.replace(this.panel.prefix, seriesStat.scopedVars) : '';
      value += seriesStat._valueFormatted;
      value += this.panel.postfix ? this.templateSrv.replace(this.panel.postfix, seriesStat.scopedVars) : '';
      seriesStat.valueFormatted = value;
    });
  }

  setValueMapping(data) {}

  setUnitFormat(subItem) {
    this.panel.format = subItem.value;
    this.refresh();
  }

  onThresholdChange = newThresholds => {
    this.panel.thresholds = newThresholds;
    this.render();
  };

  link(scope, elem, attrs, ctrl) {
    const multistatElem = elem.find('.multistat-panel');

    function render() {
      if (!ctrl.data) {
        return;
      }

      const width = multistatElem.width();
      const height = multistatElem.height();
      scope.size = { w: width, h: height };
      ctrl.setValuePrefixAndPostfix(ctrl.data);
      renderMultiStatComponent();
    }

    function renderMultiStatComponent() {
      const multistatProps = {
        stats: ctrl.data,
        options: ctrl.panel,
        size: scope.size,
      };
      const multistatReactElem = React.createElement(MultiStat, multistatProps);
      ReactDOM.render(multistatReactElem, multistatElem[0]);
    }

    this.events.on('render', function() {
      render();
      ctrl.renderingCompleted();
    });

    // cleanup when scope is destroyed
    scope.$on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(multistatElem[0]);
    });
  }
}

export { MultiStatCtrl, MultiStatCtrl as PanelCtrl };