/** @flow */
import React, {Component, PropTypes} from "react";
import EventsList from "../EventsList"
import ScanField from "../ScanField"
import ScanBeep from "../ScanBeep"
import { AutoSizer } from "react-virtualized"
import CircularProgress from "material-ui/CircularProgress";

import classes from "./HomeView.scss";

const columns = ['date','number_doc']
const columnWidths = [50,50]
const scanbeep = new ScanBeep()

export default class HomeView extends Component {

  static propTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired
  }

  handleScan(s){
    if(!s || s.match(/[^0-9]/)){
      scanbeep.error()
    }else{
      scanbeep.ok()
    }
    this.props.handleScan(s)
  }

  render () {

    const {width, height, fetch_remote, data_empty, handleMarkDeleted} = this.props

    return data_empty
      ?
      <div>
        <div className={classes.progress} style={{ position: 'relative', width: 300}}>Синхронизация при первом запуске...</div>
        <CircularProgress size={120} thickness={5} className={classes.progress} />
      </div>

      :
      <div>
        <ScanField handleScan = {::this.handleScan} />
        <EventsList
          width={width}
          height={height-100}
          fetch_remote={fetch_remote}
          columns={columns}
          columnWidths={columnWidths}
          handleMarkDeleted={handleMarkDeleted}
        />
      </div>

  }


}
