import prisma from '$lib/db';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, '/signin');
	}

	const user = await prisma.user.findUnique({
		where: {
			id: locals.session.id
		},
		select: {
			isAdmin: true
		}
	});

	if (!user?.isAdmin) {
		throw redirect(302, '/account');
	}

	const users = await prisma.user.findMany({
		select: {
			id: true,
			isAdmin: true,
			discord: {
				select: {
					id: true,
					image: true,
					username: true,
					globalUsername: true
				}
			},
			emails: {
				select: {
					email: true
				}
			},
			team: {
				select: {
					name: true,
					id: true
				}
			},
			ips: {
				select: {
					address: true
				}
			}
		}
	});

	return {
		users: users.map((user) => ({
			user: {
				id: user.id,
				isAdmin: user.isAdmin,
				emails: user.emails.map((email) => email.email),
				team: user.team!,
				discord: user.discord || undefined,
				ips: user.ips.map((ip) => ip.address)
			}
		}))
	};
};
