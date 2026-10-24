import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as payments from '../services/payments/payment.service';
import { idParams, parse } from '../validators/common';
import { adminDonationListSchema, donationSchema } from '../validators/donations.schemas';

/** Como apoiar: meios aceitos, limites e se o provedor é real. */
export async function options(_req: Request, res: Response) {
  res.json(payments.describeProvider());
}

export async function create(req: Request, res: Response) {
  const input = parse(donationSchema, req.body);
  res.status(201).json(await payments.createDonation(input, req.user));
}

export async function confirm(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  res.json(await payments.confirmDonation(id, req.user));
}

export async function mine(req: Request, res: Response) {
  res.json(await payments.listMyDonations(currentUser(req).id));
}

/* ------------------------------ Administração ------------------------------ */

export async function listAdmin(req: Request, res: Response) {
  res.json(await payments.listDonationsAdmin(parse(adminDonationListSchema, req.query)));
}

export async function statsAdmin(_req: Request, res: Response) {
  res.json(await payments.donationStats());
}
