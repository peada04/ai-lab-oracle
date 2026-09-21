# OPTIONAL. Puts this app behind Authentik forward-auth, for deployments that
# front it with a reverse proxy (Traefik, nginx) plus an Authentik outpost.
# The app has its own username/password auth and does not require this.
#
#   EXTERNAL_HOST=https://oracle.example.com \
#     docker exec -i authentik-server ak shell < authentik-forward-auth-setup.py
#
# Creates ProxyProvider "ai-lab-oracle" (forward_single) + Application and assigns
# it to the embedded outpost. 72h token validity. Idempotent.

import os

from authentik.providers.proxy.models import ProxyProvider, ProxyMode
from authentik.core.models import Application
from authentik.flows.models import Flow
from authentik.outposts.models import Outpost

EXTERNAL_HOST = os.environ.get("EXTERNAL_HOST", "https://ai-lab-oracle.example.com")

authz = Flow.objects.get(slug="default-provider-authorization-implicit-consent")
try:
    inval = Flow.objects.get(slug="default-provider-invalidation-flow")
except Flow.DoesNotExist:
    inval = Flow.objects.get(slug="default-invalidation-flow")

prov, created = ProxyProvider.objects.get_or_create(
    name="ai-lab-oracle",
    defaults=dict(
        authorization_flow=authz,
        invalidation_flow=inval,
        external_host=EXTERNAL_HOST,
        mode=ProxyMode.FORWARD_SINGLE,
    ),
)
prov.authorization_flow = authz
prov.invalidation_flow = inval
prov.external_host = EXTERNAL_HOST
prov.mode = ProxyMode.FORWARD_SINGLE
prov.access_token_validity = "hours=72"
prov.refresh_token_validity = "hours=72"
prov.save()

app, app_created = Application.objects.get_or_create(
    slug="ai-lab-oracle",
    defaults=dict(name="ai-lab-oracle", provider=prov),
)
if app.provider_id != prov.pk:
    app.provider = prov
    app.save()

out = Outpost.objects.get(name="authentik Embedded Outpost")
out.providers.add(prov)

print("OK provider_created=%s app_created=%s provider_pk=%s mode=%s" % (created, app_created, prov.pk, prov.mode))
print("OUTPOST_PROVIDERS=%s" % list(out.providers.values_list("name", flat=True)))
