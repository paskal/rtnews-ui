import "./style.scss";
import "intersection-observer";
import "whatwg-fetch";
import "./ganalitics.js";

import { Component } from "react";

import { postsPrefix } from "./settings.js";
import { render } from "react-dom";
import {
	store,
	setState,
	setTheme,
	addNotification,
	removeNotificationsWithContext,
} from "./store.jsx";
import {
	getActiveArticle,
	pollActiveArticle,
	loginViaStorage,
	getTheme,
	getArticleById,
	getIssueNumber,
} from "./api.js";
import { waitDOMReady, sleep, scrollIntoView } from "./utils.js";

import Head from "./head.jsx";
import {
	BrowserRouter as Router,
	Route,
	Switch,
	Redirect,
} from "react-router-dom";
import { ScrollContext } from "react-router-scroll-4";
import { Provider, connect } from "react-redux";
import AddArticle from "./add.jsx";
import {
	Listing,
	ArchiveListing,
	DeletedListing,
	Sorter,
} from "./articleListings.jsx";
import { Article, EditableArticle } from "./article.jsx";
import Feeds from "./feeds.jsx";
import LoginForm from "./login.jsx";
import NotFound from "./notFound.jsx";
import Notifications from "./notifications.jsx";
import LinkToCurrent from "./linkToCurrent.jsx";

import { listingRef } from "./symbols.js";

class App extends Component {
	render() {
		return (
			<Router>
				<div className="page">
					<Head {...this.props} />
					<div class="content page__content">
						<Switch>
							<Route
								path="/"
								exact={true}
								render={() => (
									<ScrollContext scrollKey="main">
										<Listing
											{...this.props}
											ref={ref => (window[listingRef] = ref)}
										/>
									</ScrollContext>
								)}
							/>
							<Route
								path="/admin/"
								exact={true}
								render={() => <Redirect to="/login/" />}
							/>
							<Route
								path="/deleted/"
								exact={true}
								render={() => (
									<ScrollContext>
										<DeletedListing {...this.props} />
									</ScrollContext>
								)}
							/>
							<Route
								path="/archive/"
								exact={true}
								render={() => (
									<ScrollContext>
										<ArchiveListing {...this.props} />
									</ScrollContext>
								)}
							/>
							<Route
								path="/add/"
								exact={true}
								render={() => {
									document.title = "Добавить новость | Новости Радио-Т";
									return <AddArticle {...this.props} />;
								}}
							/>
							<Route
								path="/feeds/"
								exact={true}
								render={() => <Feeds {...this.props} />}
							/>
							<Route
								path="/sort/"
								render={() => (
									<ScrollContext>
										<Sorter {...this.props} />
									</ScrollContext>
								)}
							/>
							<Route
								path={`${postsPrefix}/:slug`}
								render={props =>
									this.props.isAdmin ? (
										<ScrollContext
											scrollKey="post"
											shouldUpdateScroll={(_, cur) => !!cur.location.key}
										>
											<EditableArticle slug={props.match.params.slug} />
										</ScrollContext>
									) : (
										<ScrollContext
											scrollKey="post"
											shouldUpdateScroll={(_, cur) => !!cur.location.key}
										>
											<Article slug={props.match.params.slug} />
										</ScrollContext>
									)
								}
							/>
							<Route path="/login/" exact={true} render={() => <LoginForm />} />
							<Route component={NotFound} />
						</Switch>
					</div>
					<div className="footer page__footer">
						<hr />
						<a href="http://radio-t.com/">Radio-T</a>,{" "}
						{new Date().getFullYear()}
						<br />
						<span class="footer__buildtime">built on {BUILDTIME}</span>
					</div>
					<Notifications
						className="page__notifications"
						notifications={this.props.notifications}
					/>
				</div>
			</Router>
		);
	}
}

async function main() {
	try {
		const theme = getTheme();
		document.documentElement.dataset.theme = theme;
		setTheme(theme, true);
	} catch (e) {
		console.error(e);
	}

	const CApp = connect(state => {
		return state;
	})(App);

	await loginViaStorage().then(isAdmin => {
		setState({ isAdmin });
	});

	getIssueNumber().then(issueNumber => {
		if (issueNumber) {
			setState({ issueNumber });
		}
	});

	render(
		<Provider store={store}>
			<CApp />
		</Provider>,
		document.querySelector(".app")
	);

	getActiveArticle()
		.catch(() => null)
		.then(async activeId => {
			setState({ activeId });
			await waitDOMReady();
			while (true) {
				try {
					const activeId = await pollActiveArticle();
					if (activeId === store.getState().activeId) {
						removeNotificationsWithContext("active-article");
						addNotification({
							data: <b>Тема активирована</b>,
							time: 3000,
						});
						continue;
					}
					setState({ activeId });
					setTimeout(async () => {
						sleep(700).then(() => {
							document.title = "* Тема обновлена | Новости Радио-Т";
						});
						const article = await getArticleById(activeId);

						if (article && article.hasOwnProperty("title")) {
							removeNotificationsWithContext("active-article");
							addNotification(remove => ({
								data: (
									<span>
										Тема обновлена:
										<br />
										<LinkToCurrent
											title={`“${article.title}”`}
											onClick={() => remove()}
										/>
									</span>
								),
								time: null,
								context: "active-article",
							}));
						}
					}, 0);
				} catch {
					console.error("Error while setting active article");
				}
			}
		});
}

main().catch(e => console.error(e));
