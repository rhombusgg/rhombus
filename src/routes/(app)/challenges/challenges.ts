import prisma from '$lib/db';
import { avatarFallback, dynamicPoints } from '$lib/utils';
import { globalChallengeSolves } from '$lib/utils.server';

export async function getUserColumns(userId: string, teamUserIds: string[]) {
	const dbChallenges = await prisma.challenge.findMany({
		select: {
			_count: {
				select: {
					solves: true
				}
			},
			id: true,
			slug: true,
			name: true,
			description: true,
			ticketTemplate: true,
			difficulty: true,
			points: true,
			category: true,
			health: {
				select: {
					healthy: true,
					lastChecked: true
				}
			},
			author: {
				select: {
					discord: {
						select: {
							id: true,
							image: true,
							globalUsername: true,
							username: true
						}
					}
				}
			},
			solves: {
				where: {
					userId: {
						in: teamUserIds
					}
				},
				orderBy: {
					time: 'asc'
				},
				take: 1,
				select: {
					time: true,
					user: {
						select: {
							id: true,
							discord: {
								select: {
									id: true,
									image: true,
									globalUsername: true,
									username: true
								}
							},
							emails: {
								take: 1,
								select: {
									email: true
								}
							}
						}
					}
				}
			},
			writeups: {
				where: {
					userId
				},
				select: {
					link: true
				}
			}
		}
	});

	const globalSolves = await globalChallengeSolves();

	const categories = await prisma.category.findMany();

	const board = await prisma.userColumns.findMany({
		where: { userId },
		select: {
			challenges: { select: { challengeId: true } },
			categoryId: true,
			id: true
		}
	});
	const newCategories = categories.filter(
		(category) => !board.some((column) => column.categoryId === category.id)
	);
	const deletedCategories = board.filter(
		(column) => !categories.some((category) => column.categoryId === category.id)
	);
	const userChallenges = board.flatMap((column) => column.challenges);
	const newChallenges = dbChallenges.filter(
		(challenge) =>
			!userChallenges.some((userChallenge) => userChallenge.challengeId === challenge.id)
	);
	const deletedChallenges = userChallenges.filter(
		(userChallenge) => !dbChallenges.some((challenge) => challenge.id === userChallenge.challengeId)
	);

	// Create new categories
	await prisma.userColumns.createMany({
		data: newCategories.map((category) => ({
			userId,
			order: 0,
			categoryId: category.id
		}))
	});
	const updatedColumns = await prisma.userColumns.findMany({
		where: { userId },
		select: {
			id: true,
			categoryId: true
		}
	});

	// Manage challenges
	await prisma.user.update({
		where: { id: userId },
		data: {
			userChallenges: {
				createMany: {
					data: newChallenges.map((challenge) => ({
						challengeId: challenge.id,
						columnId: updatedColumns.find((column) => column.categoryId === challenge.category.id)!
							.id,
						order: 0
					}))
				},
				updateMany: deletedCategories.flatMap((column) =>
					column.challenges.flatMap((challenge) => {
						const category = dbChallenges.find(
							(chall) => chall.id === challenge.challengeId
						)?.category;
						if (!category) return [];
						return {
							where: { challengeId: challenge.challengeId },
							data: {
								columnId: updatedColumns.find((c) => c.categoryId === category.id)!.id
							}
						};
					})
				),
				deleteMany: deletedChallenges.map((userChallenge) => ({
					challengeId: userChallenge.challengeId,
					userId
				}))
			}
		},
		select: {
			id: true
		}
	});

	// Delete old categories
	await prisma.userColumns.deleteMany({
		where: {
			userId,
			categoryId: { in: deletedCategories.map((column) => column.categoryId) }
		}
	});

	// Get final board
	const columns = await prisma.userColumns.findMany({
		where: { userId },
		select: {
			challenges: { select: { challengeId: true }, orderBy: { order: 'asc' } },
			category: { select: { name: true, color: true } },
			id: true
		},
		orderBy: { order: 'asc' }
	});

	const userColumns = columns.map((column) => ({
		id: column.id,
		name: column.category.name,
		color: column.category.color,
		challenges: column.challenges.map((c) => {
			const challenge = dbChallenges.find((chall) => chall.id === c.challengeId)!;
			const solve = challenge.solves.length > 0 ? challenge.solves[0] : null;
			const globalSolveCount = globalSolves[challenge.id];
			return {
				id: challenge.id,
				slug: challenge.slug,
				name: challenge.name,
				description: challenge.description,
				category: { name: challenge.category.name, color: challenge.category.color },
				difficulty: challenge.difficulty,
				ticketTemplate: challenge.ticketTemplate,
				points: challenge.points || dynamicPoints(globalSolveCount),
				health: challenge.health,
				authorDiscord: {
					username: challenge.author.discord!.username,
					globalUsername: challenge.author.discord!.globalUsername,
					image: challenge.author.discord!.image,
					id: challenge.author.discord!.id
				},
				globalSolveCount,
				solve: solve
					? {
							time: solve.time,
							user: {
								discord: solve.user!.discord,
								email: solve.user!.discord ? undefined : solve.user!.emails[0].email,
								avatarFallback: avatarFallback(solve.user!),
								id: solve.user!.id
							}
						}
					: null,
				userWriteupLinks: challenge.writeups.map((writeup) => writeup.link)
			} satisfies Challenge;
		})
	}));

	return userColumns;
}
