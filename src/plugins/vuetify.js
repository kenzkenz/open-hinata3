// src/plugins/vuetify.js
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
    components,
    directives,
    defaults: {
        VBtn: {
            color: 'primary',
            variant: 'flat',
        },
    },
    theme: {
        defaultTheme: 'myTheme',
        themes: {
            myTheme: {
                dark: false,
                colors: {
                    primary: '#1976D2', // Vuetify default primary
                },
            },
        },
    },
})

// // Styles
// import '@mdi/font/css/materialdesignicons.css'
// import 'vuetify/styles'
//
// // Vuetify
// import { createVuetify } from 'vuetify'
//
// // const vuetify = createVuetify({
// //     defaults: {
// //         VBtn: {
// //             color: 'primary',
// //             // variant: 'outlined',
// //             // rounded: false,
// //         },
// //     },
// // })
//
// const vuetify = createVuetify({
//     defaults: {
//         VBtn: {
//             color: 'primary',
//             variant: 'flat',
//             // style: ' color: white !important',
//         },
//     },
//     theme: {
//         defaultTheme: 'myTheme',
//         themes: {
//             myTheme: {
//                 dark: false,
//                 colors: {
//                     // primary: '#f17ecd', // ← これを変えれば、v-btn も自動で変わる
//                 },
//             },
//         },
//     },
// })
//
// export default vuetify