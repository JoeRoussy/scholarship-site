import url from 'url';

const {
    noResults: noResultsErrorMessage,
    serverError: serverErrorMessage
} = window.globals.page.errorMessages;

export default () => {
    // NOTE: These private vars will be updates as the user selects universities and provinces from the results
    const {
        queryParams
    } = window.globals;

    let selectedUniversity = queryParams.universityId;
    let selectedProvince = queryParams.province;

    // NOTE: For the searches, we use the id as the item 
    $('#searchUniversityFilter').search({
        apiSettings: {
            url: '/api/universities?name={query}',
            onResponse(apiResponse) {
                const {
                    universities
                } = apiResponse;

                const formattedUniversities = universities.map(university => ({
                    name: university.name,
                    id: university._id
                }));

                return {
                    universities: formattedUniversities
                };
            }
        },
        fields: {
            results: 'universities',
            title: 'name'
        },
        minCharacters: 3,
        error: {
            noResults: noResultsErrorMessage,
            serverError: serverErrorMessage
        },
        onSelect(result) {
            selectedUniversity = result.id;
        }
    });

    const provinceSearchSource = window.globals.provinces.map(({ title, systemTitle }) => ({
        title,
        systemTitle
    }));

    $('#searchProvinceFilter').search({
        source: provinceSearchSource,
        fields: {
            title: 'title'
        },
        minCharacters: 3,
        error: {
            noResults: noResultsErrorMessage,
            serverError: serverErrorMessage
        },
        onSelect(result) {
            selectedProvince = result.systemTitle;
        }
    });

    $('#searchFilterSubmit').click(() => {
        // Get the value from the name search element
        const selectedName = $('#searchNameFilter input').val() === '' ? null : $('#searchNameFilter input').val();

        // Make sure there are still values in the province and university search bars (if a user removed the text,
        // our current values are no longer valid)
        selectedUniversity = $('#searchUniversityFilter').search('get value') !== '' ? selectedUniversity : null;
        selectedProvince = $('#searchProvinceFilter').search('get value') !== '' ? selectedProvince : null;

        // NOTE: Passing true means we can parse the QS into an object
        let urlObj = url.parse(window.location.href, true);
        urlObj.search = null;

        if (selectedUniversity) {
            urlObj.query.universityId = selectedUniversity;
        } else {
            // Need to make sure this is deleted if it was there before
            delete urlObj.query.universityId;
        }

        if (selectedProvince) {
            urlObj.query.province = selectedProvince;
        } else {
            // Need to make sure this is deleted if it was there before
            delete urlObj.query.province;
        }

        if (selectedName) {
            urlObj.query.name = selectedName;
        } else {
            // Need to make sure this is deleted if it was there before
            delete urlObj.query.name;
        }

        window.location.href = url.format(urlObj);
    });
};