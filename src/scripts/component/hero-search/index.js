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
            // TODO: Localize...
            noResults: 'No results',
            serverError: 'Oops, something went wrong.'
        }
    });

    $('#heroProvinceSearch').search({
        // TODO: Localize this and the the urls go to the search page
        source: [
            {
                title: 'Ontario',
                url: '/search?province=Ontario'
            },
            {
                title: 'British Columbia',
                url: `/search?province=${encodeUrl('British Columbia')}`
            },
            {
                title: 'Quebec',
                url: '/search?province=Quebec'
            },
            {
                title: 'Alberta',
                url: '/search?province=Alberta'
            },
            {
                title: 'Nova Scotia',
                url: `/search?province=${encodeUrl('Nova Scotia')}`
            },
            {
                title: 'Newfoundland and Labrador',
                url: `/search?province=${encodeUrl('Newfoundland and Labrador')}`
            },
            {
                title: 'Saskatchewan',
                url: '/search?province=Saskatchewan'
            },
            {
                title: 'Manitoba',
                url: '/search?province=Manitoba'
            },
            {
                title: 'New Brunswick',
                url: `/search?province=${encodeUrl('New Brunswick')}`
            },
            {
                title: 'Prince Edward Island',
                url: `/search?province=${encodeUrl('Prince Edward Island')}`
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
