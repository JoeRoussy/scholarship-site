import encodeUrl from 'encodeurl';
import { stripWord } from '../utils';

export default () => {
    initializeSearchElements();
    initalizeSearchTypeDropdown();
}

const searchTypeMapping = {
    province: '#heroProvinceSearch',
    university: '#heroUniversitySearch',
    name: '#heroNameSearch'
};

const {
    noResults: noResultsErrorMessage,
    serverError: serverErrorMessage
} = window.globals.errorMessages;

function initializeSearchElements() {
    $('.ui.search[data-hide-on-init]').hide();

    $('#heroUniversitySearch').search({
        apiSettings: {
            url: '/api/universities?name={query}',
            onResponse(apiResponse) {
                const {
                    universities
                } = apiResponse;

                const formattedUniversities = universities.map(university => ({
                    name: university.name,
                    programSearch: `/search?universityId=${university._id}`
                }));

                return {
                    universities: formattedUniversities
                };
            }
        },
        fields: {
            results: 'universities',
            title: 'name',
            url: 'programSearch'
        },
        minCharacters: 3,
        error: {
            noResults: noResultsErrorMessage,
            serverError: serverErrorMessage
        }
    });

    const provinceSearchSource = window.globals.provinces.map(({ title, systemTitle }) => ({
        title,
        url: `/search?province=${systemTitle}`
    }));

    $('#heroProvinceSearch').search({
        source: provinceSearchSource,
        fields: {
            title: 'title',
            url: 'url'
        },
        minCharacters: 3,
        error: {
            noResults: noResultsErrorMessage,
            serverError: serverErrorMessage
        }
    });

    $('#heroNameSearch').on('keypress', e => {
        const {
            keyCode
        } = e;

        if (keyCode === 13) {
            onNameQuery();
        }
    });

    $('#nameSearchButton').on('click', onNameQuery);
}

function onNameQuery() {
    const query = $('#heroNameSearch input').val();

    if (query) {
        window.location.href = `/search?name=${query}`;
    }
}

function initalizeSearchTypeDropdown() {
    $('#heroSearchDropdown').dropdown({
        onChange(value) {
            $('.heroSearchWrapper .ui.search').hide();
            $(searchTypeMapping[value]).show();
        }
    });
}
