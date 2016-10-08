import React, { Component, PropTypes } from 'react';
import TextField from 'material-ui/TextField';
import classes from "./ScanField.scss";


export default class ScanField extends Component {

  static propTypes = {
    handleScan: PropTypes.func
  }

  constructor(props){

    super(props)

    this.state = {

      focus: false,

      buffer: {
        s: '',  // текущее значение штрихкода
        kb: [], // клавиатурный буфер
        timeStamp: 0,
        clear(){
          this.s = '';
          this.kb.length = 0;
        }
      }
    }

    this.bodyKeyDown = ::this.bodyKeyDown

  }

  componentDidMount(){

    document.body.addEventListener('keydown', this.bodyKeyDown, false)

  }

  componentWillUnmount(){
    document.body.removeEventListener('keydown', this.bodyKeyDown)
  }

  bodyKeyDown(evt){

    const { buffer, focus } = this.state

    if(focus)
      return;

    if(evt.keyCode == 13) {

      if(buffer.kb.length){

        buffer.s = "";
        buffer.kb.forEach(function(code){
          if(code > 30)
            buffer.s = buffer.s + String.fromCharCode(code);
        });

        this.refs.scan.input.value = buffer.s;

        setTimeout(() => this.props.handleScan(buffer.s));

      }

    }else if(evt.keyCode == 27 || evt.keyCode == 8 || evt.keyCode == 46){
      buffer.clear();

    }else{
      // сравним время с предыдущим. если маленькое, добавляем в буфер. если большое - пишем последний элемент
      if(evt.timeStamp - buffer.timeStamp > 100)
        buffer.clear();

      buffer.timeStamp = evt.timeStamp;
      buffer.kb.push(evt.keyCode);
    }

    return false;

  }

  onKeyDown(evt){

    if (evt.stopPropagation)
      evt.stopPropagation();
    if (!evt.cancelBubble)
      evt.cancelBubble = true;

    if(evt.keyCode==13)
      this.onChange();

    return false
  }

  onChange(){
    const { buffer } = this.state
    buffer.s = this.refs.scan.input.value;
    if(buffer.s){
      setTimeout(() => {
        this.props.handleScan(buffer.s);
        setTimeout(() => {
          this.refs.scan.input.value = "";
        }, 100);
      });
    }
  }


  render() {
    return (

      <TextField
        ref='scan'
        className={classes.field}
        hintText='Штрихкод'
        onKeyDown={::this.onKeyDown}
        onFocus={() => this.setState({ focus: true })}
        onBlur={() => this.setState({ focus: false })}
      />

    );
  }
}
