import $p from 'metadata'
import { LOCATION_CHANGE } from 'react-router-redux'

// ------------------------------------
// Actions
// ------------------------------------

function handleScan(s){

  return function (dispatch, getState) {

    dispatch({
      type: 'SCAN',
      payload: s
    })

    $p.doc.planning_event.create({number_doc: s})
      .then(doc => doc.save())
      .catch(err => console.log(err))
  }

}

/**
 * Генераторы действий
 */
export const actions = {

  handleEdit: (row) => ({
    type: LOCATION_CHANGE,
    payload: {pathname:'doc_planning_event/'+row.ref, search:'',hash:''}
  }),
  handleRevert: $p.rx_actions.OBJ_REVERT,
  handleMarkDeleted: $p.rx_actions.obj_mark_deleted,
  handlePost: $p.rx_actions.obj_post,
  handleUnPost: $p.rx_actions.obj_unpost,
  handlePrint(){},
  handleAttachment(){},

  handleScan

}
