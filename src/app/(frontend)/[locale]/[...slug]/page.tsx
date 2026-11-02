import { notFound } from 'next/navigation'

/** Unknown URLs never masquerade as unfinished page roles. */
export default function UnknownPage() { notFound() }
