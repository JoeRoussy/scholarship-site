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
                    programSearch: `/api/programs?universityId=${university._id}` //TODO: Make this go to the search page
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
            // TODO: Localize...
            noResults: 'No results',
            serverError: 'Oops, something went wrong.'
        }
    });

    $('#heroProvinceSearch').search({
        // TODO: Localize this and the the urls go to the search page
        // TODO: Put all the provinces
        source: [
            {
                title: 'Ontario',
                url: '/api/programs?province=Ontario'
            },
            {
                title: 'British Columbia',
                url: `/api/programs?province=${encodeUrl('British Columbia')}`
            },
            {
                title: 'Quebec',
                url: '/api/programs?province=Quebec'
            },
            {
                title: 'Alberta',
                url: '/api/programs?province=Alberta'
            }
        ],
        fields: {
            title: 'title',
            url: 'url'
        },
        error: {
            // TODO: Localize...
            noResults: 'No results',
            serverError: 'Oops, something went wrong.'
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
        // TODO: Make this go the the search page
        window.location.href = `/api/programs?name=${query}`;
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
