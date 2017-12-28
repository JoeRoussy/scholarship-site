import urlHelper from 'url';

const {
    noResults: noResultsErrorMessage,
    serverError: serverErrorMessage
} = window.globals.page.errorMessages;

export default () => {
    const url = urlHelper.parse(window.location.href, true);

    const {
        start,
        end
    } = url.query;

    $('#applicationsListingNameSearch').search({
        apiSettings: {
            url: '/api/users?name={query}&hasScholarshipApplication=true',
            onResponse(apiResponse) {
                const {
                    users
                } = apiResponse;

                const formattedUsers = users.map(user => ({
                    name: user.name,
                    nameSearch: `/admin/applications?userId=${user._id}` // TODO: Use the url module to build the query parameters
                }));

                return {
                    users: formattedUsers
                };
            }
        },
        fields: {
            results: 'users',
            title: 'name',
            url: 'nameSearch'
        },
        minCharacters: 3,
        error: {
            noResults: noResultsErrorMessage,
            serverError: serverErrorMessage
        }
    })
}
