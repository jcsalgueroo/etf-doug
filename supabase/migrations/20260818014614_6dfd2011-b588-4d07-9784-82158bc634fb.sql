ALTER FUNCTION public.set_updated_at() SET search_path = public;

ALTER TABLE public.etf_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.etf_master FROM anon, authenticated;
REVOKE ALL ON public.etf_snapshots FROM anon, authenticated;
REVOKE ALL ON public.substitution_scores FROM anon, authenticated;
REVOKE ALL ON public.refresh_jobs FROM anon, authenticated;
REVOKE ALL ON public.explanation_requests FROM anon, authenticated;

GRANT SELECT ON public.etf_master TO anon, authenticated;
GRANT ALL ON public.etf_master TO service_role;
GRANT ALL ON public.etf_snapshots TO service_role;
GRANT ALL ON public.substitution_scores TO service_role;
GRANT ALL ON public.refresh_jobs TO service_role;
GRANT ALL ON public.explanation_requests TO service_role;

CREATE POLICY "ETF reference data is readable" ON public.etf_master FOR SELECT TO anon, authenticated USING (true);