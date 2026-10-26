// Minimal cell container for asserting layout mutations without a browser dependency.
module.exports=function gridDOM(){return {
 children:[],
 set innerHTML(html){this.children=Array.from(html.matchAll(/data-slot="(\d+)"(?: data-select="([^"]+)")?/g),m=>({dataset:{slot:m[1],...(m[2]?{select:m[2]}:{})},image:m[2]?{}:null,setAttribute(k,v){this[k]=v}}))},
 get innerHTML(){return this.children.map(n=>'data-slot="'+n.dataset.slot+'"'+(n.dataset.select?' data-select="'+n.dataset.select+'"':'')).join(' ')},
 insertBefore(node,reference){this.children.splice(this.children.indexOf(node),1);const i=reference?this.children.indexOf(reference):this.children.length;this.children.splice(i,0,node)}
}};
