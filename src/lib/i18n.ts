import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '../locales/en/common.json'
import enItinerary from '../locales/en/itinerary.json'
import esCommon from '../locales/es/common.json'
import esItinerary from '../locales/es/itinerary.json'

const resources = {
  en: { common: enCommon, itinerary: enItinerary },
  es: { common: esCommon, itinerary: esItinerary },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.startsWith('es') ? 'es' : 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n
