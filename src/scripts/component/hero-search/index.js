import encodeUrl from 'encodeurl';
import { stripWord } from '../utils';

export default () => {
    $('#hero_university_search')
        .search({
            apiSettings: {
                url: '/api/universities?name={query}',
                onResponse(apiResponse) {
                    const {
                        universities
                    } = apiResponse;

                    const formattedUniversities = universities.map(university => ({
                        name: university.name,
                        programSearch: `/api/programs?university=${encodeUrl(stripWord(university.name, 'university'))}` //TODO: Make this go to the search page
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
                noResults: 'No results',
                serverError: 'Oops, something went wrong.'
            }
        });
}
