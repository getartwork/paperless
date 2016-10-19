/**
 * ### При установке параметров сеанса
 * Процедура устанавливает параметры работы программы по умолчанию из package.json
 *
 * @param prm {Object} - в свойствах этого объекта определяем параметры работы программы
 */
export default function settings(prm) {

  Object.assign(prm, {

    // разделитель для localStorage
    local_storage_prefix: "wb_",

    // гостевые пользователи для демо-режима
    guests: [{
      username: "Рабочий",
      password: "1gNjzYQKBlcD"
    }],

    // если понадобится обратиться к 1С, будем использовать irest
    irest_enabled: true,

    // расположение rest-сервиса 1c по умолчанию
    rest_path: "",

    // расположение couchdb
    //couch_path: "http://cou206:5984/wb_",
    couch_path: "https://barcode.oknosoft.ru/couchdb/wb_",

    pouch_filter: {
      doc: "auth/planning_event",
      ram: "auth/planning_event",
      meta: "auth/meta"
    },

    // по умолчанию, обращаемся к зоне 0
    zone: 11,

    // объявляем номер демо-зоны
    zone_demo: 1,

    // размер вложений
    attachment_max_size: 10000000,

    // разрешаем сохранение пароля
    enable_save_pwd: true

  })

}
