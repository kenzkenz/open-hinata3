// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Vuetify
import { createVuetify } from 'vuetify'

// const vuetify = createVuetify({
//     defaults: {
//         VBtn: {
//             color: 'primary',
//             // variant: 'outlined',
//             // rounded: false,
//         },
//     },
// })

const vuetify = createVuetify({
    defaults: {
        VBtn: {
            color: 'primary',
            variant: 'flat',
            // style: ' color: white !important',
        },
    },
    theme: {
        defaultTheme: 'myTheme',
        themes: {
            myTheme: {
                dark: false,
                colors: {
                    // primary: '#f17ecd', // ← これを変えれば、v-btn も自動で変わる
                },
            },
        },
    },
})

export default vuetify