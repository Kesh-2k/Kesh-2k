import json, os, urllib.request
U = os.environ.get("GH_USER", "Kesh-2k")
Q = """query($u:String!){user(login:$u){createdAt followers{totalCount}
repositories(ownerAffiliations:OWNER,first:100){totalCount nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}
contributionsCollection{totalCommitContributions restrictedContributionsCount totalPullRequestContributions totalIssueContributions
contributionCalendar{totalContributions}}}}"""
req = urllib.request.Request("https://api.github.com/graphql", json.dumps({"query": Q, "variables": {"u": U}}).encode(),
    {"Authorization": "bearer " + os.environ["GH_TOKEN"], "Content-Type": "application/json"})
u = json.load(urllib.request.urlopen(req))["data"]["user"]
c = u["contributionsCollection"]
langs = {}
for r in u["repositories"]["nodes"]:
    for e in r["languages"]["edges"]:
        n = e["node"]; langs.setdefault(n["name"], [0, n["color"] or "#10b981"]); langs[n["name"]][0] += e["size"]
top = sorted(langs.items(), key=lambda x: -x[1][0])[:5]; tot = sum(v[0] for _, v in top) or 1
stats = [("Contribuições no ano", c["contributionCalendar"]["totalContributions"]),
         ("Commits", c["totalCommitContributions"] + c["restrictedContributionsCount"]),
         ("Pull requests", c["totalPullRequestContributions"]),
         ("Repositórios", u["repositories"]["totalCount"]),
         ("Estrelas", sum(r["stargazerCount"] for r in u["repositories"]["nodes"]))]
rows = "".join(f'<g class="r" style="animation-delay:{.3+i*.15:.2f}s"><text x="28" y="{84+i*30}" class="k">› {k}</text><text x="372" y="{84+i*30}" class="v" text-anchor="end">{v}</text></g>' for i, (k, v) in enumerate(stats))
bars, x = "", 420
for i, (n, (s, col)) in enumerate(top):
    w = 340 * s / tot
    bars += f'<rect x="{x:.1f}" y="70" width="{w:.1f}" height="10" fill="{col}" class="b" style="animation-delay:{.5+i*.15:.2f}s"/>'; x += w
legend = "".join(f'<g class="r" style="animation-delay:{.7+i*.15:.2f}s"><circle cx="{430}" cy="{110+i*26}" r="5" fill="{col}"/><text x="444" y="{115+i*26}" class="k">{n}</text><text x="760" y="{115+i*26}" class="v" text-anchor="end">{100*s/tot:.1f}%</text></g>' for i, (n, (s, col)) in enumerate(top))
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="790" height="250" viewBox="0 0 790 250">
<style>
.f{{font-family:'Courier New',monospace}} .h{{font:700 15px 'Courier New',monospace;fill:#34d399}}
.k{{font:14px 'Courier New',monospace;fill:#94a3b8}} .v{{font:700 15px 'Courier New',monospace;fill:#e2e8f0}}
.r{{opacity:0;animation:in .5s ease-out forwards}} .b{{transform-box:fill-box;transform:scaleX(0);animation:gr .9s ease-out forwards}}
@keyframes in{{from{{opacity:0;transform:translateX(-10px)}}to{{opacity:1;transform:none}}}} @keyframes gr{{to{{transform:scaleX(1)}}}}
</style>
<rect x="1" y="1" width="788" height="248" rx="14" fill="#0a0d12" stroke="#263040"/>
<text x="28" y="40" class="h">$ gh stats --user {U}</text><text x="420" y="40" class="h">$ linguagens --top 5</text>
<line x1="400" y1="24" x2="400" y2="226" stroke="#263040"/>
<rect x="420" y="70" width="340" height="10" rx="5" fill="#151b24"/>{bars}{rows}{legend}
</svg>'''
open("assets/stats-console.svg", "w").write(svg)
