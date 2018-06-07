import heroSearch from './component/hero-search';
import searchResults from './component/search-results-helper';
import navigation from './component/navigation';
import pagination from './component/pagination';
import modal from './component/modal';
import passwordToggle from './component/password-toggle';
import formValidation from './component/form-validation';
import pageDimmer from './component/page-dimmer-handler';
import notification from './component/notification';
import applicationNameSearch from './component/application-name-search';
import datePicker from './component/date-picker';
import { init as applicationCalandarControllerInit } from './component/application-calandar-controller';
import clipboardCopy from './component/clipboard-copy';
import promoWinner from './component/promo-winner-draw-controller';
import graphConfig from './component/graph-config';
import setTextAsHref from './component/set-text-as-href';

// Generic semantic UI setup


// Component Init
heroSearch();
searchResults();
navigation();
pagination();
modal();
passwordToggle();
formValidation();
pageDimmer();
notification();
datePicker();
applicationNameSearch();
applicationCalandarControllerInit();
clipboardCopy([ 'profileReferralLink' ]);
promoWinner();
graphConfig();
setTextAsHref();
