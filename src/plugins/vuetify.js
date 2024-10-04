// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Vuetify
import { createVuetify } from 'vuetify'

export default createVuetify({
    defaults: {
        VBtn: {
            color: 'primary',
            variant: 'outlined',
            rounded: false,
        },
    },
})
