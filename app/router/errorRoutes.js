import { required } from '../components/custom-utils';


const setup = ({
	app = required('app')
}) => {
	app.use((req, res) => {
		// Response based on what the client accepts (since this is used for API and app)
		if (req.accepts('html')) {
			return res.status(404).render('notFound', res.locals);
		}

		// respond with json
		if (req.accepts('json')) {
			res.json({
				error: true,
				message: 'Not Found.'
			});
		}

		// If all else fails just send text
		res.type('txt').send('Not found.');
	});	
};

export default setup;